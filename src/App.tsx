// Configuração central de rotas da aplicação (React Router v6).
// Grupos:
//  - Públicas: landing, demo por segmento, preços, agendamento online via slug.
//  - Auth: login, cadastro, recuperar senha.
//  - Painel (protegido por <RotaProtegida>): rotas /painel/* + /onboarding.
//  - Super admin (protegido por <RotaSuperAdmin>): rotas /super-admin/*.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"

import NotFound from "./pages/NotFound"

// Públicas
import LandingPage from "@/app/(publico)/page"
import PreviewDemo from "@/app/(publico)/demo/[segmento]/page"
import Precos from "@/app/(publico)/precos/page"
import AgendamentoOnline from "@/app/agendar/[slug]/page"

// Auth
import Login from "@/app/(auth)/login/page"
import Cadastro from "@/app/(auth)/cadastro/page"
import RecuperarSenha from "@/app/(auth)/recuperar-senha/page"
import RedefinirSenha from "@/app/(auth)/redefinir-senha/page"
import ConfirmarEmail from "@/app/(auth)/confirmar-email/page"

// Painel
import PaginaInicio from "@/app/(painel)/inicio/page"
import PaginaAgenda from "@/app/(painel)/agenda/page"
import PaginaClientes from "@/app/(painel)/clientes/page"
import PaginaDetalheCliente from "@/app/(painel)/clientes/[id]/page"
import PaginaFinanceiro from "@/app/(painel)/financeiro/page"
import PaginaCaixa from "@/app/(painel)/financeiro/caixa/page"
import PaginaEstoque from "@/app/(painel)/estoque/page"
import PaginaDetalheProduto from "@/app/(painel)/estoque/[id]/page"
import PaginaRelatorios from "@/app/(painel)/relatorios/page"
import PaginaConfiguracoes from "@/app/(painel)/configuracoes/page"
import PaginaConfiguracoesNotificacoes from "@/app/(painel)/configuracoes/notificacoes/page"
import PaginaConfiguracaoLigacaoIA from "@/app/(painel)/configuracoes/ligacao-ia/page"
import PaginaAssinatura from "@/app/(painel)/assinatura/page"
import PaginaOnboarding from "@/app/(painel)/onboarding/page"
import PaginaFila from "@/app/(painel)/fila/page"
import PaginaFilaTV from "@/app/(painel)/fila/tv/page"

// Tatuagem
import PaginaTattooOrcamentos from "@/app/(painel)/tatuagem/orcamentos/page"
import PaginaTattooPortfolio from "@/app/(painel)/tatuagem/portfolio/page"
import PaginaPublicPortfolio from "@/app/portfolio/[slug]/page"
import PaginaFichaEstetica from "@/modulos/estetica/FichaEstetica"


// Super admin
import PaginaDashboardSuperAdmin from "@/app/(super-admin)/dashboard/page"
import PaginaTenants from "@/app/(super-admin)/tenants/page"
import PaginaPlanos from "@/app/(super-admin)/planos/page"
import PaginaIntegracoes from "@/app/(super-admin)/integracoes/page"
import PaginaFinanceiroGlobal from "@/app/(super-admin)/financeiro/page"
import PaginaImpersonar from "@/app/(super-admin)/impersonar/page"

// Guards e layouts
import {
  LayoutPainel,
  LayoutSuperAdmin,
  RotaProtegida,
  RotaSuperAdmin,
} from "@/componentes/layout"

const queryClient = new QueryClient()

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/demo/:segmento" element={<PreviewDemo />} />
          <Route path="/precos" element={<Precos />} />
          <Route path="/agendar/:slug" element={<AgendamentoOnline />} />

          {/* Autenticação */}
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/confirmar-email" element={<ConfirmarEmail />} />

          {/* Painel (protegido) */}
          <Route element={<RotaProtegida />}>
            {/* Onboarding fica protegido mas SEM o layout do painel */}
            <Route path="/onboarding" element={<PaginaOnboarding />} />

            <Route path="/painel" element={<LayoutPainel />}>
              <Route index element={<Navigate to="inicio" replace />} />
              <Route path="inicio" element={<PaginaInicio />} />
              <Route path="agenda" element={<PaginaAgenda />} />
              <Route path="clientes" element={<PaginaClientes />} />
              <Route path="clientes/:id" element={<PaginaDetalheCliente />} />
              <Route path="financeiro" element={<PaginaFinanceiro />} />
              <Route path="financeiro/caixa" element={<PaginaCaixa />} />
              <Route path="financeiro/lancamentos" element={<PaginaLancamentos />} />
              <Route path="estoque" element={<PaginaEstoque />} />
              <Route path="estoque/:id" element={<PaginaDetalheProduto />} />
              <Route path="relatorios" element={<PaginaRelatorios />} />
              <Route path="configuracoes" element={<PaginaConfiguracoes />} />
              <Route path="configuracoes/notificacoes" element={<PaginaConfiguracoesNotificacoes />} />
              <Route path="configuracoes/ligacao-ia" element={<PaginaConfiguracaoLigacaoIA />} />
              <Route path="assinatura" element={<PaginaAssinatura />} />
              <Route path="fila" element={<PaginaFila />} />
              <Route path="fila/tv" element={<PaginaFilaTV />} />
              <Route path="estetica/ficha/:clienteId" element={<PaginaFichaEstetica />} />
              
              {/* Tatuagem */}
              <Route path="tatuagem/orcamentos" element={<PaginaTattooOrcamentos />} />
              <Route path="tatuagem/portfolio" element={<PaginaTattooPortfolio />} />
            </Route>
          </Route>

          {/* Portfólio Público */}
          <Route path="/portfolio/:slug" element={<PaginaPublicPortfolio />} />

          {/* Super admin (protegido) */}
          <Route element={<RotaSuperAdmin />}>
            <Route path="/super-admin" element={<LayoutSuperAdmin />}>
              <Route index element={<PaginaDashboardSuperAdmin />} />
              <Route path="dashboard" element={<PaginaDashboardSuperAdmin />} />
              <Route path="tenants" element={<PaginaTenants />} />
              <Route path="planos" element={<PaginaPlanos />} />
              <Route path="integracoes" element={<PaginaIntegracoes />} />
              <Route path="financeiro" element={<PaginaFinanceiroGlobal />} />
              <Route path="impersonar" element={<PaginaImpersonar />} />
            </Route>
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
)

export default App
