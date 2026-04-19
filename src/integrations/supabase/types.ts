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
          observacoes: string | null
          origem: Database["public"]["Enums"]["origem_agendamento"]
          profissional_id: string
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
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_agendamento"]
          profissional_id: string
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
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_agendamento"]
          profissional_id?: string
          servico_id?: string
          status?: Database["public"]["Enums"]["status_agendamento"]
          tenant_id?: string
          unidade_id?: string | null
        }
        Relationships: []
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
          cor_principal: string | null
          criado_em: string
          endereco: string | null
          horario_funcionamento: Json
          id: string
          logo_url: string | null
          tenant_id: string
        }
        Insert: {
          atualizado_em?: string
          cor_principal?: string | null
          criado_em?: string
          endereco?: string | null
          horario_funcionamento?: Json
          id?: string
          logo_url?: string | null
          tenant_id: string
        }
        Update: {
          atualizado_em?: string
          cor_principal?: string | null
          criado_em?: string
          endereco?: string | null
          horario_funcionamento?: Json
          id?: string
          logo_url?: string | null
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
      profissionais: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          especialidade: string | null
          id: string
          nome: string
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
      status_tenant: "ativo" | "suspenso" | "cancelado"
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
      status_tenant: ["ativo", "suspenso", "cancelado"],
    },
  },
} as const
