import json
import os
import numpy as np

def lambda_handler(event, context):
    # --- Security: Dynamic CORS origin control ---
    # Set ALLOWED_ORIGIN in Lambda environment variables to your Vercel domain.
    # Falls back to '*' for local development only.
    allowed_origin = os.environ.get('ALLOWED_ORIGIN', '*')
    
    headers = {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Origin': allowed_origin,
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
    }

    # Handle OPTIONS request (CORS Preflight)
    http_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method', '')
    
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    # --- Security: Only accept POST requests ---
    if http_method and http_method != 'POST':
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({"error": "Method not allowed"})
        }
        
    try:
        # Parse body
        body = event.get('body', '{}')
        if isinstance(body, str):
            data = json.loads(body)
        else:
            data = body
        
        # --- Security: Input validation with strict clamping ---
        initial_assets = max(0, min(float(data.get('initialAssets', 10000000)), 10_000_000_000))
        monthly_contribution = max(0, min(float(data.get('monthlyContribution', 10000)), 10_000_000))
        monthly_withdrawal = max(0, min(float(data.get('monthlyWithdrawal', 50000)), 10_000_000))
        years = max(1, min(int(data.get('years', 40)), 100))
        expected_return = max(-50, min(float(data.get('expectedReturn', 7.0)), 100.0)) / 100.0
        volatility = max(0, min(float(data.get('volatility', 15.0)), 100.0)) / 100.0
        inflation_mean = max(0, min(float(data.get('inflationMean', 2.0)), 50.0)) / 100.0
        
        # --- Security: Black Swan events with array length cap ---
        raw_events = data.get('blackSwanEvents', [])
        if not isinstance(raw_events, list):
            raw_events = []
        black_swan_events = raw_events[:20]  # Cap at 20 events max
        
        # Backwards compatibility for single black swan payload
        legacy_year = data.get('blackSwanYear', None)
        if legacy_year is not None:
            black_swan_events.append({"year": int(legacy_year), "drop": float(data.get('blackSwanDrop', 30.0))})
            
        # Create a fast lookup map: year -> drop% (with validation)
        crash_map = {}
        for ev in black_swan_events:
            try:
                ev_yr = max(1, min(int(ev.get("year", -1)), years))
                ev_drop = max(0, min(float(ev.get("drop", 0)), 100))
                if ev_yr > 0:
                    crash_map[ev_yr] = ev_drop
            except (ValueError, TypeError):
                continue  # Skip malformed events silently
        
        num_simulations = 1000
        
        # Annualized cashflows
        annual_contribution = monthly_contribution * 12
        base_annual_withdrawal = monthly_withdrawal * 12
        
        # Initialize paths matrix: shape (years + 1, num_simulations)
        paths = np.zeros((years + 1, num_simulations))
        paths[0] = initial_assets
        
        # Track withdrawals with deterministic inflation (for simplicity & performance)
        # Using constant inflation for the baseline spending power is standard approach
        yearly_withdrawals = base_annual_withdrawal * np.power((1 + inflation_mean), np.arange(years))
        
        for y in range(1, years + 1):
            # Generate random returns for this year across all simulations
            # Using Normal distribution. (Lognormal could also be used for GBM)
            random_returns = np.random.normal(loc=expected_return, scale=volatility, size=num_simulations)
            
            # Apply Black Swan event if specified in the crash map
            if y in crash_map:
                drop_rate = -abs(float(crash_map[y])) / 100.0
                # Override returns with the drop rate to simulate a synchronized market crash
                random_returns = np.full(num_simulations, drop_rate)
                
            # Previous year's balance
            prev_balance = paths[y - 1]
            
            # Calculate new balance: (Balance + Contribution - Withdrawal) * (1 + Return)
            withdrawal_this_year = yearly_withdrawals[y - 1]
            cashflow = annual_contribution - withdrawal_this_year
            
            new_balance = (prev_balance + cashflow) * (1 + random_returns)
            
            # Floor at 0 (Bankruptcy)
            new_balance = np.maximum(new_balance, 0)
            
            paths[y] = new_balance
            
        # Calculate statistics
        # A simulation is "ruined" if ending balance is exactly 0
        ending_balances = paths[-1]
        ruined_count = np.sum(ending_balances <= 0)
        ruin_probability = float(ruined_count / num_simulations * 100.0)
        success_rate = 100.0 - ruin_probability
        
        median_ending_wealth = float(np.median(ending_balances))
        
        # Calculate percentiles for each year
        percentiles_to_calc = [90, 75, 50, 25, 10]
        percentile_paths = []
        
        # paths is shape (years+1, 1000)
        # calculate percentiles along axis 1
        pct_matrix = np.percentile(paths, percentiles_to_calc, axis=1) # shape (5, years+1)
        
        for y in range(years + 1):
            year_data = {
                "year": y,
                "p90": round(float(pct_matrix[0][y])),
                "p75": round(float(pct_matrix[1][y])),
                "p50": round(float(pct_matrix[2][y])),
                "p25": round(float(pct_matrix[3][y])),
                "p10": round(float(pct_matrix[4][y]))
            }
            percentile_paths.append(year_data)
            
        response_body = {
            "successRate": round(success_rate, 2),
            "ruinProbability": round(ruin_probability, 2),
            "medianEndingWealth": round(median_ending_wealth),
            "percentilePaths": percentile_paths
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response_body)
        }
        
    except Exception as e:
        print(f"Lambda error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({"error": "Internal server error"})
        }
