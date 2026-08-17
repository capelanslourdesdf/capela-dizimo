#!/usr/bin/env node
/**
 * Gera o SHA-256 de uma senha, para preencher VITE_ADMIN_SENHA_HASH.
 *
 * Uso:
 *   npm run gerar:hash-senha -- "minha-senha"
 */

import { createHash } from 'node:crypto'
import process from 'node:process'

const senha = process.argv.slice(2).find((a) => !a.startsWith('--'))

if (!senha) {
  console.error('Uso: npm run gerar:hash-senha -- "minha-senha"')
  process.exit(1)
}

const hash = createHash('sha256').update(senha, 'utf8').digest('hex')

console.log(`\nVITE_ADMIN_SENHA_HASH=${hash}\n`)
