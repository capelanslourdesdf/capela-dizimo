export interface EnderecoPorCep {
  logradouro: string
  bairro: string
  cidade: string
  estado: string
}

interface ViaCepResposta {
  erro?: boolean
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
}

/**
 * Consulta o ViaCEP (API pública, sem necessidade de chave) para preencher
 * automaticamente o endereço a partir do CEP. Retorna null se o CEP não for
 * encontrado ou a consulta falhar.
 */
export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoPorCep | null> {
  const cepLimpo = cep.replace(/\D/g, '')
  if (cepLimpo.length !== 8) return null

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
    if (!response.ok) return null

    const dados = (await response.json()) as ViaCepResposta
    if (dados.erro) return null

    return {
      logradouro: dados.logradouro || '',
      bairro: dados.bairro || '',
      cidade: dados.localidade || '',
      estado: dados.uf || '',
    }
  } catch {
    return null
  }
}
