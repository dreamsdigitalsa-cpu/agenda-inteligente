export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          atualizado_em: string
          cliente_id: string
          confirmacao_manual_necessaria: boolean
          criado_em: string
          data_hora_fim: string
          data_hora_inicio: string
          id: string
          numero_sessao: number | null
          observacoes: string | null
          origem: Database["public"]["Enums"]["origem_agendamento"]
          profissional_id: string
          protocolo_id: string | null
          servico_id: string
          status: Database["public"]["Enums"]["status_agendamento"]
          tenant_id: string
          unidade_id: string | null
        }
        Insert: {
          atualizado_em?: string
          cliente_id: string
          confirmacao_manual_necessaria?: boolean
          criado_em?: string
          data_hora_fim: string
          data_hora_inicio: string
          id?: string
          numero_sessao?: number | null
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_agendamento"]
          profissional_id: string
          protocolo_id?: string | null
          servico_id: string
          status?: Database["public"]["Enums"]["status_agendamento"]
          tenant_id: string
          unidade_id?: string | null
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string
          confirmacao_manual_necessaria?: boolean
          criado_em?: string
          data_hora_fim?: string
          data_hora_inicio?: string
          id?: string
          numero_sessao?: number | null
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_agendamento"]
          profissional_id?: string
          protocolo_id?: string | null
          servico_id?: string
          status?: Database["public"]["Enums"]["status_agendamento"]
          tenant_id?: string
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_protocolo_id_fkey"
            columns: ["protocolo_id"]
            isOneToOne: false
            referencedRelation: "estetica_protocolos"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          atualizado_em: string
          como_conheceu: string | null
          criado_em: string
          data_nascimento: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string
          tem_conta: boolean
          tenant_id: string
          usuario_id: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          como_conheceu?: string | null
          criado_em?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone: string
          tem_conta?: boolean
          tenant_id: string
          usuario_id?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          como_conheceu?: string | null
          criado_em?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string
          tem_conta?: boolean
          tenant_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_tenant: {
        Row: {
          atualizado_em: string
          cnpj: string | null
          cor_principal: string | null
          criado_em: string
          endereco: string | null
          horario_funcionamento: Json
          id: string
          logo_url: string | null
          slug_publico: string | null
          telefone: string | null
          tenant_id: string
        }
        Insert: {
          atualizado_em?: string
          cnpj?: string | null
          cor_principal?: string | null
          criado_em?: string
          endereco?: string | null
          horario_funcionamento?: Json
          id?: string
          logo_url?: string | null
          slug_publico?: string | null
          telefone?: string | null
          tenant_id: string
        }
        Update: {
          atualizado_em?: string
          cnpj?: string | null
          cor_principal?: string | null
          criado_em?: string
          endereco?: string | null
          horario_funcionamento?: Json
          id?: string
          logo_url?: string | null
          slug_publico?: string | null
          telefone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_tenant_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      estetica_anamneses_modelos: {
        Row: {
          atualizado_em: string
          campos: Json
          criado_em: string
          id: string
          nome: string
          protocolo_id: string | null
          tenant_id: string
        }
        Insert: {
          atualizado_em?: string
          campos?: Json
          criado_em?: string
          id?: string
          nome: string
          protocolo_id?: string | null
          tenant_id: string
        }
        Update: {
          atualizado_em?: string
          campos?: Json
          criado_em?: string
          id?: string
          nome?: string
          protocolo_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estetica_anamneses_modelos_protocolo_id_fkey"
            columns: ["protocolo_id"]
            isOneToOne: false
            referencedRelation: "estetica_protocolos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estetica_anamneses_modelos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      estetica_anamneses_preenchidas: {
        Row: {
          agendamento_id: string | null
          assinatura_url: string | null
          atualizado_em: string
          cliente_id: string
          criado_em: string
          id: string
          modelo_id: string
          pdf_url: string | null
          respostas: Json
          tenant_id: string
        }
        Insert: {
          agendamento_id?: string | null
          assinatura_url?: string | null
          atualizado_em?: string
          cliente_id: string
          criado_em?: string
          id?: string
          modelo_id: string
          pdf_url?: string | null
          respostas?: Json
          tenant_id: string
        }
        Update: {
          agendamento_id?: string | null
          assinatura_url?: string | null
          atualizado_em?: string
          cliente_id?: string
          criado_em?: string
          id?: string
          modelo_id?: string
          pdf_url?: string | null
          respostas?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estetica_anamneses_preenchidas_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estetica_anamneses_preenchidas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estetica_anamneses_preenchidas_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "estetica_anamneses_modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estetica_anamneses_preenchidas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      estetica_fotos_evolucao: {
        Row: {
          agendamento_id: string | null
          cliente_id: string
          criado_em: string
          data_foto: string
          foto_url: string
          id: string
          protocolo_id: string | null
          tenant_id: string
          tipo: string
        }
        Insert: {
          agendamento_id?: string | null
          cliente_id: string
          criado_em?: string
          data_foto?: string
          foto_url: string
          id?: string
          protocolo_id?: string | null
          tenant_id: string
          tipo: string
        }
        Update: {
          agendamento_id?: string | null
          cliente_id?: string
          criado_em?: string
          data_foto?: string
          foto_url?: string
          id?: string
          protocolo_id?: string | null
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "estetica_fotos_evolucao_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estetica_fotos_evolucao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estetica_fotos_evolucao_protocolo_id_fkey"
            columns: ["protocolo_id"]
            isOneToOne: false
            referencedRelation: "estetica_protocolos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estetica_fotos_evolucao_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      estetica_protocolos: {
        Row: {
          atualizado_em: string
          criado_em: string
          id: string
          intervalo_minimo_dias: number
          nome: string
          numero_sessoes: number
          tenant_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          intervalo_minimo_dias?: number
          nome: string
          numero_sessoes?: number
          tenant_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          intervalo_minimo_dias?: number
          nome?: string
          numero_sessoes?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estetica_protocolos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fila_espera: {
        Row: {
          chamado_em: string | null
          cliente_id: string | null
          cliente_nome: string
          cliente_telefone: string | null
          created_at: string
          entrada_em: string
          id: string
          posicao: number
          profissional_id: string | null
          servico_id: string | null
          status: Database["public"]["Enums"]["status_fila"]
          tenant_id: string
          unidade_id: string
          updated_at: string
        }
        Insert: {
          chamado_em?: string | null
          cliente_id?: string | null
          cliente_nome: string
          cliente_telefone?: string | null
          created_at?: string
          entrada_em?: string
          id?: string
          posicao: number
          profissional_id?: string | null
          servico_id?: string | null
          status?: Database["public"]["Enums"]["status_fila"]
          tenant_id: string
          unidade_id: string
          updated_at?: string
        }
        Update: {
          chamado_em?: string | null
          cliente_id?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          created_at?: string
          entrada_em?: string
          id?: string
          posicao?: number
          profissional_id?: string | null
          servico_id?: string | null
          status?: Database["public"]["Enums"]["status_fila"]
          tenant_id?: string
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fila_espera_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_espera_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_espera_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_espera_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_espera_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes_estoque: {
        Row: {
          criado_em: string | null
          custo_unitario: number
          data_compra: string
          data_validade: string | null
          fornecedor: string | null
          id: string
          nota_fiscal: string | null
          numero_lote: string | null
          produto_id: string
          quantidade: number
          tenant_id: string
        }
        Insert: {
          criado_em?: string | null
          custo_unitario: number
          data_compra: string
          data_validade?: string | null
          fornecedor?: string | null
          id?: string
          nota_fiscal?: string | null
          numero_lote?: string | null
          produto_id: string
          quantidade: number
          tenant_id: string
        }
        Update: {
          criado_em?: string | null
          custo_unitario?: number
          data_compra?: string
          data_validade?: string | null
          fornecedor?: string | null
          id?: string
          nota_fiscal?: string | null
          numero_lote?: string | null
          produto_id?: string
          quantidade?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_estoque_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_estoque: {
        Row: {
          agendamento_id: string | null
          criado_em: string | null
          criado_por_usuario_id: string
          id: string
          lote_id: string | null
          motivo: string | null
          produto_id: string
          quantidade: number
          tenant_id: string
          tipo: string
        }
        Insert: {
          agendamento_id?: string | null
          criado_em?: string | null
          criado_por_usuario_id: string
          id?: string
          lote_id?: string | null
          motivo?: string | null
          produto_id: string
          quantidade: number
          tenant_id: string
          tipo: string
        }
        Update: {
          agendamento_id?: string | null
          criado_em?: string | null
          criado_por_usuario_id?: string
          id?: string
          lote_id?: string | null
          motivo?: string | null
          produto_id?: string
          quantidade?: number
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_permissao: {
        Row: {
          atualizado_em: string
          criado_em: string
          descricao: string | null
          id: string
          nome: string
          padrao: boolean
          tenant_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
          padrao?: boolean
          tenant_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
          padrao?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_permissao_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes_do_perfil: {
        Row: {
          codigo_permissao: string
          criado_em: string
          perfil_id: string
        }
        Insert: {
          codigo_permissao: string
          criado_em?: string
          perfil_id: string
        }
        Update: {
          codigo_permissao?: string
          criado_em?: string
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_do_perfil_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_permissao"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          atualizado_em: string | null
          categoria: string | null
          codigo_barras: string | null
          codigo_interno: string | null
          criado_em: string | null
          custo_medio: number
          descricao: string | null
          estoque_atual: number
          estoque_minimo: number | null
          foto_url: string | null
          id: string
          margem_lucro: number | null
          nome: string
          preco_venda: number | null
          tenant_id: string
          tipo: string
          unidade_id: string
          unidade_medida: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string | null
          categoria?: string | null
          codigo_barras?: string | null
          codigo_interno?: string | null
          criado_em?: string | null
          custo_medio?: number
          descricao?: string | null
          estoque_atual?: number
          estoque_minimo?: number | null
          foto_url?: string | null
          id?: string
          margem_lucro?: number | null
          nome: string
          preco_venda?: number | null
          tenant_id: string
          tipo?: string
          unidade_id: string
          unidade_medida?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string | null
          categoria?: string | null
          codigo_barras?: string | null
          codigo_interno?: string | null
          criado_em?: string | null
          custo_medio?: number
          descricao?: string | null
          estoque_atual?: number
          estoque_minimo?: number | null
          foto_url?: string | null
          id?: string
          margem_lucro?: number | null
          nome?: string
          preco_venda?: number | null
          tenant_id?: string
          tipo?: string
          unidade_id?: string
          unidade_medida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_por_servico: {
        Row: {
          produto_id: string
          quantidade_padrao: number
          servico_id: string
        }
        Insert: {
          produto_id: string
          quantidade_padrao: number
          servico_id: string
        }
        Update: {
          produto_id?: string
          quantidade_padrao?: number
          servico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_por_servico_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_por_servico_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      profissionais: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          especialidade: string | null
          id: string
          nome: string
          slug: string | null
          telefone: string | null
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          especialidade?: string | null
          id?: string
          nome: string
          slug?: string | null
          telefone?: string | null
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          especialidade?: string | null
          id?: string
          nome?: string
          slug?: string | null
          telefone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profissionais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          duracao_minutos: number
          id: string
          nome: string
          preco_centavos: number
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          duracao_minutos?: number
          id?: string
          nome: string
          preco_centavos?: number
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          duracao_minutos?: number
          id?: string
          nome?: string
          preco_centavos?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tattoo_budget_sessions: {
        Row: {
          agendamento_id: string | null
          atualizado_em: string
          budget_id: string
          criado_em: string
          data: string
          id: string
          notas: string | null
          valor: number | null
        }
        Insert: {
          agendamento_id?: string | null
          atualizado_em?: string
          budget_id: string
          criado_em?: string
          data?: string
          id?: string
          notas?: string | null
          valor?: number | null
        }
        Update: {
          agendamento_id?: string | null
          atualizado_em?: string
          budget_id?: string
          criado_em?: string
          data?: string
          id?: string
          notas?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tattoo_budget_sessions_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tattoo_budget_sessions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "tattoo_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      tattoo_budgets: {
        Row: {
          atualizado_em: string
          cliente_id: string
          criado_em: string
          deposito_pago: boolean | null
          descricao: string | null
          estilo: string
          id: string
          profissional_id: string
          referencias: string[] | null
          regiao_corpo: string
          status: Database["public"]["Enums"]["tattoo_budget_status"]
          tamanho: string
          tenant_id: string
          valor_deposito: number | null
          valor_estimado: number | null
        }
        Insert: {
          atualizado_em?: string
          cliente_id: string
          criado_em?: string
          deposito_pago?: boolean | null
          descricao?: string | null
          estilo: string
          id?: string
          profissional_id: string
          referencias?: string[] | null
          regiao_corpo: string
          status?: Database["public"]["Enums"]["tattoo_budget_status"]
          tamanho: string
          tenant_id: string
          valor_deposito?: number | null
          valor_estimado?: number | null
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string
          criado_em?: string
          deposito_pago?: boolean | null
          descricao?: string | null
          estilo?: string
          id?: string
          profissional_id?: string
          referencias?: string[] | null
          regiao_corpo?: string
          status?: Database["public"]["Enums"]["tattoo_budget_status"]
          tamanho?: string
          tenant_id?: string
          valor_deposito?: number | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tattoo_budgets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tattoo_budgets_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tattoo_budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tattoo_portfolio_items: {
        Row: {
          atualizado_em: string
          categoria: string | null
          criado_em: string
          descricao: string | null
          estilo: string
          id: string
          imagem_url: string
          profissional_id: string
          tenant_id: string
        }
        Insert: {
          atualizado_em?: string
          categoria?: string | null
          criado_em?: string
          descricao?: string | null
          estilo: string
          id?: string
          imagem_url: string
          profissional_id: string
          tenant_id: string
        }
        Update: {
          atualizado_em?: string
          categoria?: string | null
          criado_em?: string
          descricao?: string | null
          estilo?: string
          id?: string
          imagem_url?: string
          profissional_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tattoo_portfolio_items_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tattoo_portfolio_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
          plano: Database["public"]["Enums"]["plano_tenant"]
          segmento: Database["public"]["Enums"]["segmento_tenant"]
          slug: string | null
          status: Database["public"]["Enums"]["status_tenant"]
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome: string
          plano?: Database["public"]["Enums"]["plano_tenant"]
          segmento: Database["public"]["Enums"]["segmento_tenant"]
          slug?: string | null
          status?: Database["public"]["Enums"]["status_tenant"]
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
          plano?: Database["public"]["Enums"]["plano_tenant"]
          segmento?: Database["public"]["Enums"]["segmento_tenant"]
          slug?: string | null
          status?: Database["public"]["Enums"]["status_tenant"]
        }
        Relationships: []
      }
      unidades: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome: string
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          criado_em: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean
          atualizado_em: string
          auth_user_id: string
          criado_em: string
          email: string
          id: string
          nome: string
          perfil_id: string | null
          tenant_id: string | null
          unidade_id: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          auth_user_id: string
          criado_em?: string
          email: string
          id?: string
          nome: string
          perfil_id?: string | null
          tenant_id?: string | null
          unidade_id?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          auth_user_id?: string
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          perfil_id?: string | null
          tenant_id?: string | null
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_permissao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_tenant_atual: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      tem_permissao: {
        Args: { _codigo: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "profissional"
        | "recepcionista"
        | "cliente"
      origem_agendamento: "painel" | "online" | "whatsapp" | "telefone"
      plano_tenant: "freemium" | "profissional"
      segmento_tenant:
        | "salao"
        | "barbearia"
        | "estetica"
        | "tatuagem"
        | "manicure"
      status_agendamento:
        | "agendado"
        | "confirmado"
        | "em_atendimento"
        | "concluido"
        | "cancelado"
        | "faltou"
      status_fila: "aguardando" | "chamado" | "atendido" | "cancelado"
      status_tenant: "ativo" | "suspenso" | "cancelado"
      tattoo_budget_status:
        | "em_analise"
        | "aprovado"
        | "em_andamento"
        | "concluido"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "admin",
        "profissional",
        "recepcionista",
        "cliente",
      ],
      origem_agendamento: ["painel", "online", "whatsapp", "telefone"],
      plano_tenant: ["freemium", "profissional"],
      segmento_tenant: [
        "salao",
        "barbearia",
        "estetica",
        "tatuagem",
        "manicure",
      ],
      status_agendamento: [
        "agendado",
        "confirmado",
        "em_atendimento",
        "concluido",
        "cancelado",
        "faltou",
      ],
      status_fila: ["aguardando", "chamado", "atendido", "cancelado"],
      status_tenant: ["ativo", "suspenso", "cancelado"],
      tattoo_budget_status: [
        "em_analise",
        "aprovado",
        "em_andamento",
        "concluido",
      ],
    },
  },
} as const
