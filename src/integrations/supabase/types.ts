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
      companies: {
        Row: {
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          nome: string
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contract_benefits: {
        Row: {
          company_id: string
          contractor_id: string
          created_at: string
          data_pagamento: string | null
          id: string
          mes_pagamento: number | null
          observacoes: string | null
          periodicidade: string
          requer_nota_fiscal: boolean
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          company_id: string
          contractor_id: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes_pagamento?: number | null
          observacoes?: string | null
          periodicidade?: string
          requer_nota_fiscal?: boolean
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          company_id?: string
          contractor_id?: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes_pagamento?: number | null
          observacoes?: string | null
          periodicidade?: string
          requer_nota_fiscal?: boolean
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_benefits_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_companies: {
        Row: {
          company_id: string
          contractor_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          contractor_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          contractor_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_companies_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_financial_benefits: {
        Row: {
          company_id: string
          contractor_id: string
          created_at: string
          data_pagamento: string | null
          descricao_outro: string | null
          dias_disponiveis: number | null
          dias_utilizados: number
          financial_contract_id: string | null
          id: string
          mes_pagamento: number | null
          observacoes: string | null
          periodicidade: string
          periodo_remunerado: boolean | null
          requer_nota_fiscal: boolean
          status: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          company_id: string
          contractor_id: string
          created_at?: string
          data_pagamento?: string | null
          descricao_outro?: string | null
          dias_disponiveis?: number | null
          dias_utilizados?: number
          financial_contract_id?: string | null
          id?: string
          mes_pagamento?: number | null
          observacoes?: string | null
          periodicidade: string
          periodo_remunerado?: boolean | null
          requer_nota_fiscal?: boolean
          status?: string
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          company_id?: string
          contractor_id?: string
          created_at?: string
          data_pagamento?: string | null
          descricao_outro?: string | null
          dias_disponiveis?: number | null
          dias_utilizados?: number
          financial_contract_id?: string | null
          id?: string
          mes_pagamento?: number | null
          observacoes?: string | null
          periodicidade?: string
          periodo_remunerado?: boolean | null
          requer_nota_fiscal?: boolean
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contractor_financial_benefits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_financial_benefits_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_financial_benefits_financial_contract_id_fkey"
            columns: ["financial_contract_id"]
            isOneToOne: false
            referencedRelation: "contractor_financial_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_financial_contracts: {
        Row: {
          ajuda_de_custo: number | null
          company_id: string
          contractor_id: string
          created_at: string
          data_encerramento: string | null
          data_inicio: string | null
          data_vencimento: string | null
          id: string
          observacoes: string | null
          status: string
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          ajuda_de_custo?: number | null
          company_id: string
          contractor_id: string
          created_at?: string
          data_encerramento?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_mensal: number
        }
        Update: {
          ajuda_de_custo?: number | null
          company_id?: string
          contractor_id?: string
          created_at?: string
          data_encerramento?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "contractor_financial_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_financial_contracts_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          agencia: string | null
          ajuda_custo: number | null
          area: string | null
          banco: string | null
          cargo: string | null
          chave_pix: string | null
          cidade: string | null
          company_id: string
          conta: string | null
          contrato_observacoes: string | null
          contrato_status: string | null
          cpf_cnpj: string | null
          created_at: string
          data_encerramento: string | null
          data_inicio: string | null
          data_vencimento: string | null
          email: string | null
          estado: string | null
          gestor: string | null
          id: string
          inscricao_municipal: string | null
          nome_completo: string
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string | null
          status: string
          telefone: string | null
          tipo_chave_pix: string | null
          tipo_conta: string | null
          updated_at: string
          user_id: string | null
          valor_mensal: number | null
        }
        Insert: {
          agencia?: string | null
          ajuda_custo?: number | null
          area?: string | null
          banco?: string | null
          cargo?: string | null
          chave_pix?: string | null
          cidade?: string | null
          company_id: string
          conta?: string | null
          contrato_observacoes?: string | null
          contrato_status?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_encerramento?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          email?: string | null
          estado?: string | null
          gestor?: string | null
          id?: string
          inscricao_municipal?: string | null
          nome_completo: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string | null
          status?: string
          telefone?: string | null
          tipo_chave_pix?: string | null
          tipo_conta?: string | null
          updated_at?: string
          user_id?: string | null
          valor_mensal?: number | null
        }
        Update: {
          agencia?: string | null
          ajuda_custo?: number | null
          area?: string | null
          banco?: string | null
          cargo?: string | null
          chave_pix?: string | null
          cidade?: string | null
          company_id?: string
          conta?: string | null
          contrato_observacoes?: string | null
          contrato_status?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_encerramento?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          email?: string | null
          estado?: string | null
          gestor?: string | null
          id?: string
          inscricao_municipal?: string | null
          nome_completo?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string | null
          status?: string
          telefone?: string | null
          tipo_chave_pix?: string | null
          tipo_conta?: string | null
          updated_at?: string
          user_id?: string | null
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_funcionarios: {
        Row: {
          company_id: string | null
          created_at: string
          data_emissao: string | null
          data_validade: string | null
          funcionario_id: string
          id: string
          nome_arquivo: string
          numero_documento: string | null
          observacoes: string | null
          tipo: string
          updated_at: string
          url_arquivo: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          data_emissao?: string | null
          data_validade?: string | null
          funcionario_id: string
          id?: string
          nome_arquivo: string
          numero_documento?: string | null
          observacoes?: string | null
          tipo: string
          updated_at?: string
          url_arquivo?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          data_emissao?: string | null
          data_validade?: string | null
          funcionario_id?: string
          id?: string
          nome_arquivo?: string
          numero_documento?: string | null
          observacoes?: string | null
          tipo?: string
          updated_at?: string
          url_arquivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          cargo: string | null
          company_id: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          departamento: string | null
          email: string | null
          id: string
          nome_completo: string
          observacoes: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          departamento?: string | null
          email?: string | null
          id?: string
          nome_completo: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          departamento?: string | null
          email?: string | null
          id?: string
          nome_completo?: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          company_id: string
          competencia: string
          contractor_id: string
          created_at: string
          data_emissao: string | null
          data_vencimento: string | null
          id: string
          numero: string | null
          observacoes: string | null
          payment_id: string | null
          status: string
          submitted_at: string | null
          submitted_by_user_id: string | null
          updated_at: string
          url_arquivo: string | null
          valor: number
        }
        Insert: {
          company_id: string
          competencia: string
          contractor_id: string
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string | null
          id?: string
          numero?: string | null
          observacoes?: string | null
          payment_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by_user_id?: string | null
          updated_at?: string
          url_arquivo?: string | null
          valor: number
        }
        Update: {
          company_id?: string
          competencia?: string
          contractor_id?: string
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string | null
          id?: string
          numero?: string | null
          observacoes?: string | null
          payment_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by_user_id?: string | null
          updated_at?: string
          url_arquivo?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          company_id: string
          competencia: string
          contractor_id: string
          created_at: string
          data_emissao: string | null
          data_vencimento: string | null
          id: string
          numero: string | null
          observacoes: string | null
          status: string
          updated_at: string
          url_arquivo: string | null
          valor: number
        }
        Insert: {
          company_id: string
          competencia: string
          contractor_id: string
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string | null
          id?: string
          numero?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          url_arquivo?: string | null
          valor: number
        }
        Update: {
          company_id?: string
          competencia?: string
          contractor_id?: string
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string | null
          id?: string
          numero?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          url_arquivo?: string | null
          valor?: number
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          company_id: string
          competencia: string
          contractor_id: string
          created_at: string
          data_pagamento: string | null
          descricao: string | null
          id: string
          observacoes: string | null
          status: string
          updated_at: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          company_id: string
          competencia: string
          contractor_id: string
          created_at?: string
          data_pagamento?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor: number
          vencimento?: string | null
        }
        Update: {
          company_id?: string
          competencia?: string
          contractor_id?: string
          created_at?: string
          data_pagamento?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          company_id: string
          competencia: string
          contractor_id: string
          created_at: string
          data_pagamento: string | null
          descricao: string | null
          id: string
          observacoes: string | null
          status: string
          tipo_pagamento: string
          tipo_pagamento_antes_padronizacao: string | null
          updated_at: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          company_id: string
          competencia: string
          contractor_id: string
          created_at?: string
          data_pagamento?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          tipo_pagamento?: string
          tipo_pagamento_antes_padronizacao?: string | null
          updated_at?: string
          valor: number
          vencimento?: string | null
        }
        Update: {
          company_id?: string
          competencia?: string
          contractor_id?: string
          created_at?: string
          data_pagamento?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          tipo_pagamento?: string
          tipo_pagamento_antes_padronizacao?: string | null
          updated_at?: string
          valor?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          id: string
          nome_completo: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          id: string
          nome_completo: string
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          nome_completo?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_finance: { Args: never; Returns: boolean }
      current_active_company_id: { Args: never; Returns: string }
      current_active_user_has_role: {
        Args: { allowed_roles: string[] }
        Returns: boolean
      }
      current_company_id: { Args: never; Returns: string }
      current_professional_contractor_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      dj_is_active_status: { Args: { p_status: string }; Returns: boolean }
      dj_normalize_role: { Args: { p_role: string }; Returns: string }
      dj_pay_can_access_invoice_object: {
        Args: { p_name: string }
        Returns: boolean
      }
      dj_pay_can_delete_invoice_object: {
        Args: { p_name: string }
        Returns: boolean
      }
      dj_pay_can_insert_invoice_object: {
        Args: { p_name: string }
        Returns: boolean
      }
      dj_pay_has_company_role: {
        Args: { p_company_id: string; p_roles: string[] }
        Returns: boolean
      }
      dj_pay_has_role: {
        Args: { p_company_id: string; p_roles: string[] }
        Returns: boolean
      }
      dj_pay_invoice_object_scope: {
        Args: { p_name: string }
        Returns: {
          invoice_company_id: string
          invoice_contractor_id: string
          invoice_id: string
        }[]
      }
      dj_pay_is_admin: { Args: { p_company_id: string }; Returns: boolean }
      dj_pay_is_financeiro_ou_admin: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      dj_pay_is_invoice_staff: { Args: never; Returns: boolean }
      dj_pay_is_own_contractor:
        | {
            Args: { p_company_id: string; p_contractor_id: string }
            Returns: boolean
          }
        | { Args: { p_contractor_id: string }; Returns: boolean }
      dj_try_uuid: { Args: { p_value: string }; Returns: string }
      is_company_admin: { Args: never; Returns: boolean }
      is_company_member: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      is_own_contractor: {
        Args: { target_contractor_id: string }
        Returns: boolean
      }
      payment_type_label: { Args: { payment_type: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
