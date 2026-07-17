# Evaluation & Diagnostic Testbench for GlikoSense (Python implementation)
import time
import math

def calculate_active_at_time(target_time_ms, past_logs, rules):
    iob = 0.0
    cob = 0.0
    fast_cob_active = 0.0
    slow_cob_active = 0.0
    pob = 0.0
    fob = 0.0
    
    pizza_mult = rules.get('pizzaEffectMultiplier', 1.0)
    pk_params = rules.get('pkParams', {})
    pk_fast = pk_params.get('fastCarbDuration', 1.5)
    pk_normal = pk_params.get('normalCarbDuration', 3.0)
    pk_slow = pk_params.get('slowCarbDuration', 5.0)
    pk_insulin = pk_params.get('insulinTau', 1.25)

    cutoff_time = target_time_ms - (8 * 60 * 60 * 1000)

    def classify_meal_glycemia(meal):
        text = str(meal.get('description') or meal.get('notes') or meal.get('note') or meal.get('nameValue') or "").lower()
        linked = meal.get('linkedMeal', {})
        if isinstance(linked, dict):
            text += " " + str(linked.get('name', '')).lower()
        
        is_fast_carb = 0
        is_slow_carb = 0
        fast_keywords = ["sok", "cukier", "glukoza", "glucose", "żel", "dextro", "miód", "honey", "cola", "słodkie", "słodki", "żelki", "banan", "dżem", "sprite", "fanta", "oranżada", "herbata z cukrem", "cukierki", "czekolada", "owoce", "juice"]
        slow_keywords = ["pizza", "kebab", "burger", "ser", "cheese", "orzechy", "mięso", "meat", "pasta", "spaghetti", "makaron", "boczek", "frytki", "masło", "tłuszcz", "białko", "karkówka", "kiełbasa", "nuts", "chocolate"]
        if any(kw in text for kw in fast_keywords):
            is_fast_carb = 1
        if any(kw in text for kw in slow_keywords):
            is_slow_carb = 1
            
        protein = meal.get('protein') or (linked.get('protein') if isinstance(linked, dict) else 0) or 0
        fat = meal.get('fat') or (linked.get('fat') if isinstance(linked, dict) else 0) or 0
        carbs = meal.get('value') or meal.get('carbs') or (linked.get('carbs') if isinstance(linked, dict) else 0) or 0
        
        if protein > 15 or fat > 12:
            is_slow_carb = 1
        if carbs > 0 and (fat + protein) / carbs > 0.8:
            is_slow_carb = 1
        if carbs > 15 and (fat + protein) < 3:
            is_fast_carb = 1
        return is_fast_carb, is_slow_carb

    for log in reversed(past_logs):
        log_time = log.get('timestamp') or log.get('createdAt')
        if not log_time:
            continue
        if log_time < cutoff_time:
            break
        diff_ms = target_time_ms - log_time
        if diff_ms < 0:
            continue
        
        diff_hours = diff_ms / (1000.0 * 60 * 60)
        
        insulin = log.get('value') if log.get('type') == 'bolus' else log.get('insulin', 0)
        if insulin and diff_hours < 5.0:
            tau = pk_insulin
            remaining = (1.0 + diff_hours / tau) * math.exp(-diff_hours / tau)
            adjusted_remaining = max(0.0, remaining - 0.05)
            iob += insulin * adjusted_remaining

        carbs = log.get('value') if log.get('type') == 'meal' else (log.get('linkedMeal', {}).get('carbs', 0) if isinstance(log.get('linkedMeal'), dict) else log.get('carbs', 0))
        if carbs:
            is_fast_carb, is_slow_carb = classify_meal_glycemia(log)
            carb_duration = pk_normal * pizza_mult
            if is_fast_carb:
                carb_duration = pk_fast
            elif is_slow_carb:
                carb_duration = pk_slow * pizza_mult
            if diff_hours < carb_duration:
                remaining = max(0.0, 1.0 - (diff_hours / carb_duration))
                cob += carbs * remaining
                if is_fast_carb:
                    fast_cob_active += carbs * remaining
                elif is_slow_carb:
                    slow_cob_active += carbs * remaining

        protein = log.get('protein', 0) if log.get('type') == 'meal' else (log.get('linkedMeal', {}).get('protein', 0) if isinstance(log.get('linkedMeal'), dict) else 0)
        prot_duration = pk_slow * pizza_mult
        if protein and diff_hours < prot_duration:
            pob += protein * max(0.0, 1.0 - (diff_hours / prot_duration))

        fat = log.get('fat', 0) if log.get('type') == 'meal' else (log.get('linkedMeal', {}).get('fat', 0) if isinstance(log.get('linkedMeal'), dict) else 0)
        fat_duration = (pk_slow + 2.0) * pizza_mult
        if fat and diff_hours < fat_duration:
            fob += fat * max(0.0, 1.0 - (diff_hours / fat_duration))

    return {
        'iob': max(0.0, iob), 'cob': max(0.0, cob),
        'fastCobActive': max(0.0, fast_cob_active), 'slowCobActive': max(0.0, slow_cob_active),
        'pob': max(0.0, pob), 'fob': max(0.0, fob)
    }

if __name__ == '__main__':
    now = int(time.time() * 1000)
    print("==================================================")
    print("   GLIKOSENSE 3.0 BENCHMARK (PYTHON TESTBENCH)    ")
    print("==================================================\n")
    scenarios = [
        {"name": "1. Szybkie węglowodany (Sok glukozowy na hipo)", "logs": [{"type": "meal", "value": 30, "description": "sok glukoza", "timestamp": now - int(30 * 60 * 1000)}], "rules": {}},
        {"name": "2. Posiłek tłuszczowo-białkowy z Efektem Pizzy", "logs": [{"type": "meal", "value": 80, "description": "pizza z serem i boczkiem", "timestamp": now - int(2 * 60 * 60 * 1000), "protein": 35, "fat": 45}, {"type": "bolus", "value": 8.0, "timestamp": now - int(2 * 60 * 60 * 1000)}], "rules": {"pizzaEffectMultiplier": 1.2}}
    ]
    for s in scenarios:
        active = calculate_active_at_time(now, s["logs"], s["rules"])
        print(f"▶ Scenariusz: {s['name']}")
        print(f"   COB: {active['cob']:.1f}g, IOB: {active['iob']:.2f}j, POB: {active['pob']:.1f}g, FOB: {active['fob']:.1f}g")
