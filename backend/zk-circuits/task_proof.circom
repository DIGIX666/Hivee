pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

/*
 * Circuit ZK-SNARK pour prouver qu'un paiement futur >= montant minimum du prêt
 * Sans révéler l'identité du client ni les détails de la tâche
 */
template TaskProof() {
    // ========== INPUTS PRIVÉS (cachés au vérificateur) ==========
    signal input clientIdHash;      // Hash de l'ID client
    signal input taskDescHash;      // Hash de la description de tâche
    signal input nonce;             // Nonce pour unicité
    signal input timestamp;         // Timestamp pour fraîcheur

    // ========== INPUTS PUBLICS (visibles au vérificateur) ==========
    signal input agentAddress;      // Adresse de l'agent (converti en field)
    signal input expectedPayment;   // Montant attendu (en micro-USDC, 6 decimals)
    signal input minLoanAmount;     // Montant minimum du prêt

    // ========== OUTPUT PUBLIC ==========
    signal output proofHash;        // Hash de preuve unique

    // ========== CONTRAINTE 1: Vérifier que le paiement >= montant minimum ==========
    component gte = GreaterEqThan(64);
    gte.in[0] <== expectedPayment;
    gte.in[1] <== minLoanAmount;
    gte.out === 1;  // Doit être vrai

    // ========== CONTRAINTE 2: Générer le hash de preuve ==========
    // Utilise Poseidon (hash ZK-friendly)
    component hasher = Poseidon(7);
    hasher.inputs[0] <== clientIdHash;
    hasher.inputs[1] <== taskDescHash;
    hasher.inputs[2] <== nonce;
    hasher.inputs[3] <== timestamp;
    hasher.inputs[4] <== agentAddress;
    hasher.inputs[5] <== expectedPayment;
    hasher.inputs[6] <== minLoanAmount;

    proofHash <== hasher.out;
}

// Déclarer les inputs publics
component main {public [agentAddress, expectedPayment, minLoanAmount]} = TaskProof();
