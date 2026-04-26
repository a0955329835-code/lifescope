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
        
        # --- Pro Upgrade: Advanced Risk & Strategy Parameters ---
        jump_probability = max(0.0, min(float(data.get('jumpProbability', 0.0)), 100.0)) / 100.0
        jump_impact = max(0.0, min(float(data.get('jumpImpact', 20.0)), 100.0)) / 100.0
        is_dynamic = bool(data.get('isDynamic', False))
        dynamic_ratio = max(0.0, min(float(data.get('dynamicRatio', 20.0)), 100.0)) / 100.0
        
        # --- V2: Life Stages & Salary Growth ---
        salary_growth_rate = max(0.0, min(float(data.get('salaryGrowthRate', 0.0)), 20.0)) / 100.0
        
        # --- V3: Leverage ---
        leverage_amount = max(0.0, float(data.get('leverageAmount', 0.0)))
        leverage_rate = max(0.0, float(data.get('leverageRate', 0.0))) / 100.0
        leverage_years = max(0, int(data.get('leverageYears', 0)))
        leverage_recur_years = max(0, int(data.get('leverageRecurYears', 0)))
        
        raw_stages = data.get('lifeStages', [])
        if not isinstance(raw_stages, list):
            raw_stages = []
        life_stages = raw_stages[:10]
        FAMILY_MULTIPLIERS = {1: 1.0, 2: 1.6, 3: 2.2, 4: 2.8, 5: 3.4, 6: 4.0}
        
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
        
        # Pre-calculate leverage amortization
        annual_loan_payment = 0.0
        loan_balances = np.zeros(years + 1)
        loan_balances[0] = leverage_amount
        
        if leverage_amount > 0 and leverage_years > 0:
            if leverage_rate > 0:
                monthly_rate = leverage_rate / 12
                total_months = leverage_years * 12
                monthly_loan_payment = leverage_amount * monthly_rate * ((1 + monthly_rate)**total_months) / (((1 + monthly_rate)**total_months) - 1)
                annual_loan_payment = monthly_loan_payment * 12
                
                current_bal = leverage_amount
                for y in range(1, years + 1):
                    if y <= leverage_years:
                        for _ in range(12):
                            current_bal = current_bal * (1 + monthly_rate) - monthly_loan_payment
                        loan_balances[y] = max(0, current_bal)
                    else:
                        loan_balances[y] = 0
            else:
                annual_loan_payment = leverage_amount / leverage_years
                for y in range(1, years + 1):
                    if y <= leverage_years:
                        loan_balances[y] = max(0, leverage_amount - annual_loan_payment * y)
                    else:
                        loan_balances[y] = 0
        
        # Initialize paths matrix: shape (years + 1, num_simulations)
        paths = np.zeros((years + 1, num_simulations))
        paths[0] = initial_assets + leverage_amount
        
        # Build family multiplier array from life stages
        family_mult_array = np.ones(years)
        prev_end = 0
        for stage in life_stages:
            try:
                end_yr = max(1, min(int(stage.get('endYear', years)), years))
                fam_size = max(1, min(int(stage.get('familySize', 1)), 6))
                mult = FAMILY_MULTIPLIERS.get(fam_size, 1.0)
                family_mult_array[prev_end:min(end_yr, years)] = mult
                prev_end = end_yr
            except (ValueError, TypeError):
                continue
        if prev_end < years and life_stages:
            try:
                last_size = max(1, min(int(life_stages[-1].get('familySize', 1)), 6))
                family_mult_array[prev_end:] = FAMILY_MULTIPLIERS.get(last_size, 1.0)
            except (ValueError, TypeError):
                pass
        
        # Withdrawals: inflation x family size multiplier
        yearly_withdrawals = base_annual_withdrawal * np.power((1 + inflation_mean), np.arange(years)) * family_mult_array
        
        # Salary growth: contributions increase over career
        salary_factors = np.power((1 + salary_growth_rate), np.arange(years))
        yearly_contributions = annual_contribution * salary_factors
        
        # Track previous year's market returns for dynamic spending
        prev_market_returns = np.zeros(num_simulations)
        
        for y in range(1, years + 1):
            # Generate random returns for this year across all simulations
            # Using Normal distribution. (Lognormal could also be used for GBM)
            random_returns = np.random.normal(loc=expected_return, scale=volatility, size=num_simulations)
            
            # --- Pro Upgrade: Jump Diffusion (Random Black Swan) ---
            if jump_probability > 0:
                # Generate a boolean mask where random value < jump_probability
                has_jump = np.random.rand(num_simulations) < jump_probability
                # Subtract jump_impact from returns for those specific simulations
                random_returns -= has_jump * jump_impact
            
            # Apply Black Swan event if specified in the crash map
            if y in crash_map:
                drop_rate = -abs(float(crash_map[y])) / 100.0
                # Override returns with the drop rate to simulate a synchronized market crash
                random_returns = np.full(num_simulations, drop_rate)
                
            # --- V3: Leverage Refill (Rolling Loan) ---
            if leverage_recur_years > 0 and y > 1 and (y - 1) % leverage_recur_years == 0:
                refill_amount = leverage_amount - loan_balances[y - 1]
                if refill_amount > 0:
                    paths[y - 1] += refill_amount
                    loan_balances[y - 1] = leverage_amount

            # Previous year's balance
            prev_balance = paths[y - 1]
            
            # --- Pro Upgrade: Dynamic Spending Strategy ---
            # Start with the baseline inflation-adjusted withdrawal for this year
            withdrawal_this_year = np.full(num_simulations, yearly_withdrawals[y - 1])
            
            if is_dynamic and y > 1:
                # If market return was negative last year, reduce withdrawal by dynamic_ratio
                withdrawal_this_year[prev_market_returns < 0] *= (1.0 - dynamic_ratio)
            
            # Calculate new balance: (Balance + Contribution - Withdrawal) * (1 + Return)
            # If recurring, we assume we are always paying the loan
            is_paying = (leverage_recur_years > 0) or (y <= leverage_years)
            loan_deduction = annual_loan_payment if (leverage_amount > 0 and is_paying) else 0.0
            cashflow = yearly_contributions[y - 1] - withdrawal_this_year - loan_deduction
            
            new_balance = (prev_balance + cashflow) * (1 + random_returns)
            
            # Floor at 0 (Bankruptcy)
            new_balance = np.maximum(new_balance, 0)
            
            paths[y] = new_balance
            prev_market_returns = random_returns
            
        # Calculate statistics
        # A simulation is "ruined" if investment account is exactly 0
        ruined_count = np.sum(paths[-1] <= 0)
        ruin_probability = float(ruined_count / num_simulations * 100.0)
        success_rate = 100.0 - ruin_probability
        
        # Report Net Worth for the UI
        net_worth_paths = paths - loan_balances[:, np.newaxis]
        median_ending_wealth = float(np.median(net_worth_paths[-1]))
        
        # Calculate percentiles for each year using Net Worth
        percentiles_to_calc = [90, 75, 50, 25, 10]
        percentile_paths = []
        
        # paths is shape (years+1, 1000)
        # calculate percentiles along axis 1
        pct_matrix = np.percentile(net_worth_paths, percentiles_to_calc, axis=1) # shape (5, years+1)
        
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
