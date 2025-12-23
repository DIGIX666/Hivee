# Circuits ZK-SNARK pour Hivee

Ce dossier contient les circuits ZK-SNARK utilisés pour prouver qu'un agent peut rembourser un prêt sans révéler les détails de la tâche ou l'identité du client.

## Vue d'ensemble du système

### Workflow Agent sans Fonds Initiaux

Lorsqu'un agent est uploadé, il n'a **aucun fonds** au départ. Voici le workflow complet:

```
1. Agent Upload
   └─> Agent créé avec status: PENDING
       └─> Scan de sécurité
           └─> Modification du code (injection payment address)
               └─> Déploiement
                   └─> Agent status: ACTIVE (mais sans fonds)

2. Tâche Demandée
   └─> Task créée avec status: PENDING
       └─> Génération automatique ZK proof
           └─> ZK proof prouve que expectedPayment >= minLoanAmount
               └─> Task status: AWAITING_FUNDS

3. Demande de Prêt Automatique
   └─> Recherche d'un lender compatible
       ├─> SI LENDER TROUVÉ:
       │   └─> Loan créé avec status: REQUESTED
       │       └─> Envoi on-chain
       │           └─> En attente d'approbation du lender
       │
       └─> SI AUCUN LENDER:
           └─> Loan créé avec status: PENDING
               └─> Loan reste en PENDING jusqu'à ce qu'un lender accepte
                   └─> Task reste en AWAITING_FUNDS

4. Lender Accepte (futur)
   └─> Loan status: APPROVED
       └─> Fonds transférés
           └─> Loan status: DISBURSED
               └─> Task status: FUNDED
                   └─> Agent peut exécuter la tâche

5. Tâche Complétée
   └─> Task status: COMPLETED
       └─> Paiement reçu
           └─> Task status: PAID
               └─> Remboursement du prêt
                   └─> Loan status: REPAID
```

## Architecture ZK-SNARK

### Circuit: task_proof.circom

Le circuit prouve que:
- `expectedPayment >= minLoanAmount` (contrainte vérifiée)
- Sans révéler:
  - L'identité du client (clientIdHash)
  - La description de la tâche (taskDescHash)
  - Le nonce et timestamp

### Inputs

**Privés** (cachés):
- `clientIdHash`: Hash de l'ID client
- `taskDescHash`: Hash de la description
- `nonce`: Nombre aléatoire pour unicité
- `timestamp`: Horodatage

**Publics** (visibles):
- `agentAddress`: Adresse de l'agent
- `expectedPayment`: Montant attendu (micro-USDC, 6 decimals)
- `minLoanAmount`: Montant minimum du prêt

**Output**:
- `proofHash`: Hash de preuve unique (Poseidon)

## Installation et Setup

### Prérequis

1. **Installer Circom**:
   ```bash
   # Installer Rust si nécessaire
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

   # Installer Circom
   git clone https://github.com/iden3/circom.git
   cd circom
   cargo build --release
   cargo install --path circom
   ```

2. **Vérifier l'installation**:
   ```bash
   circom --version
   snarkjs --version
   ```

### Setup Automatique

Le moyen le plus simple est d'utiliser le script de setup:

```bash
cd /home/kazai/777LAB/Hivee/backend/zk-circuits
./setup.sh
```

Ce script va:
1. Installer les dépendances (circomlib, snarkjs)
2. Télécharger Powers of Tau (~96 MB)
3. Compiler le circuit
4. Générer les clés de preuve et vérification
5. Tester avec des inputs exemple

**Temps estimé**: 5-10 minutes

### Setup Manuel

Si vous préférez faire le setup manuellement:

```bash
# 1. Installer les dépendances
npm install

# 2. Télécharger Powers of Tau
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau

# 3. Compiler le circuit
circom task_proof.circom --r1cs --wasm --sym -o build

# 4. Générer les clés
snarkjs groth16 setup build/task_proof.r1cs powersOfTau28_hez_final_14.ptau keys/task_proof_0000.zkey

snarkjs zkey contribute keys/task_proof_0000.zkey keys/task_proof_0001.zkey \
  --name="First contribution" \
  --entropy="$(date +%s)$(openssl rand -hex 32)" \
  -v

snarkjs zkey contribute keys/task_proof_0001.zkey keys/task_proof.zkey \
  --name="Second contribution" \
  --entropy="$(date +%s)$(openssl rand -hex 32)" \
  -v

# 5. Exporter la clé de vérification
snarkjs zkey export verificationkey keys/task_proof.zkey keys/verification_key.json

# 6. Nettoyer
rm keys/task_proof_0000.zkey keys/task_proof_0001.zkey
```

## Activer les ZK-SNARK en Production

Une fois le setup terminé, activez les preuves réelles:

```typescript
// backend/src/services/zkProof.service.ts
export class ZKProofService {
  private zkCircuitPath = path.join(__dirname, '../../zk-circuits');
  private useRealZKProof = true; // ← Changer false en true

  // ...
}
```

## Utilisation

### Générer une Preuve

Le service `zkProofService` génère automatiquement des preuves lorsqu'une tâche est créée:

```typescript
const { proofHash, proofData } = await zkProofService.generateTaskProof(
  clientId,
  expectedPayment,
  taskDescription,
  agentAddress,
  minLoanAmount
);
```

### Vérifier une Preuve

```typescript
const isValid = await zkProofService.verifyProof(proofData);
```

## Statuts des Prêts

Le système supporte maintenant les statuts suivants pour les prêts:

| Statut | Description |
|--------|-------------|
| `PENDING` | En attente d'un lender (aucun lender disponible) |
| `REQUESTED` | Lender trouvé, demande envoyée |
| `APPROVED` | Lender a approuvé le prêt |
| `DISBURSED` | Fonds transférés à l'agent |
| `REPAID` | Prêt remboursé |
| `REJECTED` | Lender a rejeté le prêt |
| `DEFAULTED` | Agent en défaut de paiement |

### Comportement sans Lender

Lorsqu'aucun lender n'est disponible:
- Le prêt est créé avec `status: PENDING`
- `lenderAgentId` est `null`
- `interestRate` et `expectedRepayment` sont `null`
- Le prêt reste en base de données en attente
- Lorsqu'un lender devient disponible, il peut être assigné au prêt

## Performance

### Taille du Circuit
- **Contraintes**: ~534 (très léger)
- **Inputs privés**: 4
- **Inputs publics**: 3
- **Output public**: 1

### Temps de Génération
- **Preuve**: ~2-5 secondes
- **Vérification off-chain**: ~50-100ms
- **Vérification on-chain**: ~100-200ms

### Taille des Fichiers
- **Clé de preuve** (task_proof.zkey): ~3-5 MB
- **Preuve JSON**: ~1-2 KB
- **Clé de vérification**: ~1-2 KB

## Tests

### Test Unitaire de la Preuve

```bash
# Créer des inputs de test
cat > test_inputs.json << 'EOF'
{
  "clientIdHash": "12345678901234567890123456789012",
  "taskDescHash": "98765432109876543210987654321098",
  "nonce": 123456,
  "timestamp": 1704067200,
  "agentAddress": "1234567890123456789012345678901234567890",
  "expectedPayment": 15000000,
  "minLoanAmount": 10000000
}
EOF

# Générer et vérifier
npm run test
```

### Test du Workflow Complet

Voir le fichier `backend/scripts/simulate-client-task.ts` pour un exemple complet.

## Sécurité

### Ce qui est Caché (Zero-Knowledge)
✅ Identité du client
✅ Description de la tâche
✅ Nonce et timestamp

### Ce qui est Révélé (Public)
⚠️ Adresse de l'agent
⚠️ Montant du paiement attendu
⚠️ Montant minimum du prêt

### Garanties Cryptographiques
- **Soundness**: Impossible de créer une fausse preuve
- **Zero-Knowledge**: Les données privées ne fuient pas
- **Completeness**: Une preuve valide est toujours acceptée

## Génération du Vérificateur Solidity (Optionnel)

Pour vérifier les preuves on-chain:

```bash
npm run export-verifier
# Génère: verifier.sol
```

Le contrat peut ensuite être déployé sur la blockchain pour vérification on-chain.

## Dépannage

### Erreur: `circom: command not found`
```bash
# Ajouter au PATH
export PATH=$PATH:~/.cargo/bin
# Ou réinstaller circom
```

### Erreur: `Powers of Tau file not found`
```bash
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau
```

### Preuve Invalide
Vérifiez que:
- `expectedPayment >= minLoanAmount`
- Les valeurs sont en micro-USDC (6 decimals)
- Exemple: 15.5 USDC = 15500000

## Ressources

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [Circomlib Circuits](https://github.com/iden3/circomlib)
- [ZK-SNARK Explainer](https://z.cash/technology/zksnarks/)
- [Poseidon Hash](https://www.poseidon-hash.info/)

## Prochaines Étapes

1. ✅ Configuration des circuits ZK
2. ✅ Support des prêts en PENDING sans lender
3. 🔄 Interface pour que les lenders acceptent les prêts PENDING
4. 🔄 Vérification on-chain des preuves
5. 🔄 Optimisation des circuits (réduction des contraintes)
6. 🔄 Multi-Party Computation pour sécurité maximale
