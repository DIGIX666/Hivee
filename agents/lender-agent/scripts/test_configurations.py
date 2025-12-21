#!/usr/bin/env python3
"""
Test script to demonstrate all available lender agent configurations
"""

import sys
import os
from decimal import Decimal

# Add project root to path
project_root = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, project_root)

from core.models.models import LenderConfig, LoanRequest, RiskLevel
from core.services.lender_service import LenderService

def test_lender_configurations():
    """Test different lender agent configurations"""
    print("🧪 Testing Lender Agent Configurations\n")

    service = LenderService()

    # Configuration 1: Agent conservateur
    print("1️⃣ Agent Conservateur (Score élevé requis, frais bas)")
    config_conservative = LenderConfig(
        available_capital=Decimal("50000"),
        max_loan_amount=Decimal("5000"),
        min_credit_score=750,  # Score élevé requis
        base_interest_rate=Decimal("4.5"),  # Taux bas
        credit_fee_percentage=Decimal("0.5"),  # Frais bas
        fixed_processing_fee=Decimal("15"),
        risk_tolerance=RiskLevel.LOW
    )

    agent_conservative = service.create_lender_agent("Agent Conservateur", config_conservative)
    print(f"   ✅ Agent créé: {agent_conservative.id}")
    print(f"   📊 Score minimum: {config_conservative.min_credit_score}")
    print(f"   💰 Montant max: ${config_conservative.max_loan_amount}")
    print(f"   📈 Taux de base: {config_conservative.base_interest_rate}%")
    print(f"   💳 Frais: {config_conservative.credit_fee_percentage}% + ${config_conservative.fixed_processing_fee}")

    # Test calcul des coûts pour prêt de 1000$ sur 30 jours
    costs = service.calculate_total_loan_cost(config_conservative, Decimal("1000"), 30)
    print(f"   🧮 Coût prêt 1000$/30j: ${costs['total_repayment']:.2f} (APR: {costs['effective_apr']:.1f}%)\n")

    # Configuration 2: Agent agressif
    print("2️⃣ Agent Agressif (Score bas accepté, frais élevés)")
    config_aggressive = LenderConfig(
        available_capital=Decimal("25000"),
        max_loan_amount=Decimal("10000"),
        min_credit_score=500,  # Score bas accepté
        base_interest_rate=Decimal("15.0"),  # Taux élevé
        credit_fee_percentage=Decimal("3.0"),  # Frais élevés
        fixed_processing_fee=Decimal("50"),
        risk_tolerance=RiskLevel.HIGH
    )

    agent_aggressive = service.create_lender_agent("Agent Agressif", config_aggressive)
    print(f"   ✅ Agent créé: {agent_aggressive.id}")
    print(f"   📊 Score minimum: {config_aggressive.min_credit_score}")
    print(f"   💰 Montant max: ${config_aggressive.max_loan_amount}")
    print(f"   📈 Taux de base: {config_aggressive.base_interest_rate}%")
    print(f"   💳 Frais: {config_aggressive.credit_fee_percentage}% + ${config_aggressive.fixed_processing_fee}")

    # Test calcul des coûts pour prêt de 1000$ sur 30 jours
    costs = service.calculate_total_loan_cost(config_aggressive, Decimal("1000"), 30)
    print(f"   🧮 Coût prêt 1000$/30j: ${costs['total_repayment']:.2f} (APR: {costs['effective_apr']:.1f}%)\n")

    # Configuration 3: Agent équilibré
    print("3️⃣ Agent Équilibré (Paramètres modérés)")
    config_balanced = LenderConfig(
        available_capital=Decimal("100000"),
        max_loan_amount=Decimal("7500"),
        min_credit_score=650,  # Score modéré
        base_interest_rate=Decimal("8.0"),  # Taux modéré
        credit_fee_percentage=Decimal("1.5"),  # Frais modérés
        fixed_processing_fee=Decimal("25"),
        risk_tolerance=RiskLevel.MEDIUM
    )

    agent_balanced = service.create_lender_agent("Agent Équilibré", config_balanced)
    print(f"   ✅ Agent créé: {agent_balanced.id}")
    print(f"   📊 Score minimum: {config_balanced.min_credit_score}")
    print(f"   💰 Montant max: ${config_balanced.max_loan_amount}")
    print(f"   📈 Taux de base: {config_balanced.base_interest_rate}%")
    print(f"   💳 Frais: {config_balanced.credit_fee_percentage}% + ${config_balanced.fixed_processing_fee}")

    # Test calcul des coûts pour prêt de 1000$ sur 30 jours
    costs = service.calculate_total_loan_cost(config_balanced, Decimal("1000"), 30)
    print(f"   🧮 Coût prêt 1000$/30j: ${costs['total_repayment']:.2f} (APR: {costs['effective_apr']:.1f}%)\n")

    # Test des rejets basés sur le score de crédit
    print("4️⃣ Test de filtrage par score de crédit")

    # Demande avec score faible (550)
    loan_request_low_score = LoanRequest(
        id="test-low-score",
        borrower_id="borrower-123",
        amount=Decimal("2000"),
        interest_rate=Decimal("8.0"),
        duration_days=60,
        credit_score=550,  # Score faible
        zk_proof="proof_hash_123",
        purpose="business"
    )

    # Test avec agent conservateur (score min 750)
    try:
        evaluation_conservative = service.evaluate_loan_request(agent_conservative.id, loan_request_low_score)
        print(f"   Agent Conservateur (score min 750): {evaluation_conservative.recommendation}")
    except Exception as e:
        print(f"   Agent Conservateur: Rejet - {e}")

    # Test avec agent agressif (score min 500)
    try:
        evaluation_aggressive = service.evaluate_loan_request(agent_aggressive.id, loan_request_low_score)
        print(f"   Agent Agressif (score min 500): {evaluation_aggressive.recommendation}")
    except Exception as e:
        print(f"   Agent Agressif: Rejet - {e}")

    print("\n✅ Tests de configuration terminés!")
    print("\n📋 Résumé des configurations disponibles:")
    print("   • Montant maximum par prêt (max_loan_amount)")
    print("   • Score de crédit minimum requis (min_credit_score)")
    print("   • Taux d'intérêt de base (base_interest_rate)")
    print("   • Frais de traitement en % (credit_fee_percentage)")
    print("   • Frais fixes de traitement (fixed_processing_fee)")
    print("   • Tolérance au risque (risk_tolerance)")
    print("   • Capital disponible (available_capital)")

if __name__ == "__main__":
    test_lender_configurations()