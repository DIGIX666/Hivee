#!/bin/bash
# Script pour lancer une simulation de tâche

cd "$(dirname "$0")/.."
npx tsx scripts/simulate-client-task.ts
