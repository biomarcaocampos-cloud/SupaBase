import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { QueueState, ServiceDesk, WaitingTicket, CompletedService, AbandonedTicket, ServiceType, AgendaEntry } from '../types';
import api from '../services/apiService';

const TOTAL_DESKS = 20;

export interface ReinsertResult {
  success: boolean;
  message: string;
  details?: {
    deskId: number;
    user: string;
    timestamp: number;
  };
}

const defaultTips = [
  "Consulte seu processo regularmente no site do Tribunal de Justiça. Acompanhar o andamento é sua responsabilidade.",
  "Prazos são importantes. Perder um prazo pode levar à extinção do seu processo. Fique atento às intimações.",
  "Mantenha seus dados atualizados. Informe ao cartório qualquer mudança de endereço, telefone ou e-mail.",
  "A primeira audiência é para tentativa de acordo (conciliação). Sua presença é obrigatória.",
  "A ausência do autor na audiência de conciliação resulta no arquivamento do processo.",
  "Leve todos os documentos originais que comprovem seu direito no dia da audiência.",
  "Em causas de até 20 salários mínimos, você não precisa de advogado. Acima disso, a presença de um é obrigatória.",
  "Comunicações oficiais são feitas pelo Diário de Justiça Eletrônico ou no sistema do processo.",
  "O cartório pode usar WhatsApp ou e-mail para intimações desde que sejam autorizados pela parte. Ofereça seu e-mail e não perca nenhuma intimação.",
  "Atermação é o ato de registrar seu pedido inicial no Juizado, transformando sua reclamação em um processo.",
  "Se a outra parte não cumprir a sentença, você deve pedir o 'Cumprimento de Sentença' para iniciar a cobrança.",
  "Para apresentar um recurso contra a sentença, a contratação de um advogado é obrigatória.",
  "Se não puder pagar as custas de um recurso, peça a 'Justiça Gratuita', comprovando sua necessidade.",
  "Seja claro e objetivo em seus pedidos e depoimentos, focando nos fatos importantes para a sua causa.",
  "Guarde todas as provas: e-mails, notas fiscais, contratos, conversas de WhatsApp e outros documentos.",
  "Muitas audiências são conduzidas por um Juiz Leigo, que prepara uma proposta de sentença para o Juiz Togado aprovar.",
  "Trate todos com respeito durante as audiências – a parte contrária, advogados e servidores.",
  "Um acordo pode resolver seu problema de forma mais rápida e eficaz. Esteja aberto a negociar.",
  "O acesso ao Juizado Especial Cível é gratuito na primeira instância. Custas só são cobradas em caso de recurso.",
  "Se tiver dúvidas sobre o andamento do processo, procure o balcão de atendimento do cartório."
];

const initialDesks: ServiceDesk[] = Array.from({ length: TOTAL_DESKS }, (_, i) => ({
  id: i + 1,
  user: null,
  currentTicket: null,
  currentTicketInfo: null,
  serviceStartTime: null,
  services: [],
}));

const initialState: QueueState = {
  nextNormalTicket: 1,
  nextPreferentialTicket: 1,
  waitingNormal: [],
  waitingPreferential: [],
  calledHistory: [],
  desks: initialDesks,
  completedServices: [],
  abandonedTickets: [],
  tips: defaultTips,
  alertMessage: null,
  agenda: [],
};

interface QueueContextType {
  state: QueueState;
  dispenseTicket: (type: 'NORMAL' | 'PREFERENCIAL', service: ServiceType) => Promise<string>;
  callSpecificTicket: (deskId: number, type: 'NORMAL' | 'PREFERENCIAL') => void;
  login: (deskId: number, user: { id: string; displayName: string }, services: ServiceType[]) => void;
  logout: (deskId: number) => void;
  startService: (deskId: number) => void;
  endService: (deskId: number) => void;
  resetSystem: () => void;
  reinsertTicket: (ticketNumber: string) => Promise<ReinsertResult>;
  updateTips: (newTips: string[]) => void;
  setAlertMessage: (message: string) => void;
  clearAlertMessage: () => void;
  addAgendaEntry: (entryData: Omit<AgendaEntry, 'id' | 'data_do_registro' | 'status'>) => Promise<void>;
  updateAgendaEntry: (updatedEntry: AgendaEntry) => Promise<void>;
  cancelAgendaEntry: (entryId: string) => void;
  refreshState: () => Promise<void>;
  recallTicket: (deskId: number) => Promise<void>;
  abandonTicket: (deskId: number) => Promise<void>;
}

export const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<QueueState>(initialState);

  // Load initial state from backend
  const refreshState = useCallback(async () => {
    try {
      // Load tickets
      const ticketsResponse = await api.tickets.getAll({ status: 'AGUARDANDO' });
      const tickets = ticketsResponse.tickets || [];

      const waitingNormal = tickets
        .filter((t: any) => t.ticket_type === 'NORMAL')
        .map((t: any) => ({
          number: t.ticket_number,
          dispenseTimestamp: new Date(t.created_at).getTime(),
          type: 'NORMAL' as const,
          service: t.service as ServiceType,
        }));

      const waitingPreferential = tickets
        .filter((t: any) => t.ticket_type === 'PREFERENCIAL')
        .map((t: any) => ({
          number: t.ticket_number,
          dispenseTimestamp: new Date(t.created_at).getTime(),
          type: 'PREFERENCIAL' as const,
          service: t.service as ServiceType,
        }));

      // Load desks
      const desksResponse = await api.desks.getAll();
      const backendDesks = desksResponse.desks || [];

      const desks = initialDesks.map(defaultDesk => {
        const backendDesk = backendDesks.find((d: any) => d.id === defaultDesk.id);
        if (!backendDesk) return defaultDesk;

        return {
          ...defaultDesk,
          user: backendDesk.user_id ? {
            id: backendDesk.user_id,
            displayName: backendDesk.user_display_name || '',
          } : null,
          currentTicket: backendDesk.current_ticket,
          currentTicketInfo: backendDesk.current_ticket_info ? JSON.parse(backendDesk.current_ticket_info) : null,
          serviceStartTime: backendDesk.service_start_time,
          services: backendDesk.services || [],
        };
      });

      // Load history
      const historyResponse = await api.history.getCalledHistory(100);
      const calledHistory = (historyResponse.history || []).map((h: any) => ({
        ticketNumber: h.ticket_number,
        deskNumber: h.desk_number,
        timestamp: h.timestamp,
        type: h.ticket_type,
      }));

      // Load completed services
      const completedResponse = await api.history.getCompletedServices(100);
      const completedServices = (completedResponse.services || []).map((s: any) => ({
        ticketNumber: s.ticket_number,
        deskId: s.desk_id,
        userId: s.user_id,
        userName: s.user_name,
        serviceDuration: s.service_duration,
        waitTime: s.wait_time,
        completedTimestamp: s.completed_timestamp,
        service: s.service,
      }));

      // Load abandoned tickets
      const abandonedResponse = await api.history.getAbandonedTickets(100);
      const abandonedTickets = (abandonedResponse.tickets || []).map((t: any) => ({
        ticketNumber: t.ticket_number,
        deskId: t.desk_id,
        userId: t.user_id,
        userName: t.user_name,
        calledTimestamp: t.called_timestamp,
        abandonedTimestamp: t.abandoned_timestamp,
        type: t.ticket_type,
        waitTime: t.wait_time,
        service: t.service,
      }));

      // Load agenda
      const agendaResponse = await api.agenda.getAll();
      const agenda = (agendaResponse.agenda || []).map((a: any) => ({
        id: a.id,
        ticketNumber: a.ticket_number,
        nomeCompleto: a.nome_completo,
        cpf: a.cpf,
        telefone: a.telefone,
        email: a.email,
        dataAgendamento: a.data_agendamento,
        horario: a.horario,
        servico: a.servico,
        observacoes: a.observacoes,
        documentosNecessarios: a.documentos_necessarios || [],
        data_do_registro: a.data_do_registro,
        status: a.status,
      }));

      // Load config
      // Backend returns { value: "..." } but we might be expecting config_value. Let's handle both.
      const tipsResponse = await api.config.get('tips').catch(() => ({ value: JSON.stringify(defaultTips) }));
      const tipsValue = tipsResponse.value || tipsResponse.config_value || JSON.stringify(defaultTips);
      let tips;
      try {
        tips = JSON.parse(tipsValue);
      } catch (e) {
        console.warn('⚠️ Falha ao fazer parse das dicas, usando padrão:', e);
        tips = defaultTips;
      }

      const alertResponse = await api.config.get('alert_message').catch(() => ({ value: '' }));
      const alertMessage = alertResponse.value || alertResponse.config_value || null;

      setState({
        ...state,
        waitingNormal,
        waitingPreferential,
        desks,
        calledHistory,
        completedServices,
        abandonedTickets,
        agenda,
        tips,
        alertMessage,
      });

      console.log('✅ Estado carregado do backend');
    } catch (error) {
      console.warn('⚠️ Erro ao carregar estado do backend:', error);
      // Keep current state if load fails
    }
  }, []);

  // Load state on mount
  useEffect(() => {
    refreshState();
  }, []);

  const finalizeCurrentTicket = async (desk: ServiceDesk, currentState: QueueState): Promise<QueueState> => {
    if (!desk.user || !desk.currentTicketInfo) {
      return currentState;
    }

    if (desk.serviceStartTime) {
      // Completed service
      const waitTime = desk.serviceStartTime - desk.currentTicketInfo.dispenseTimestamp;
      const serviceDuration = Date.now() - desk.serviceStartTime;

      const newCompletedService: CompletedService = {
        ticketNumber: desk.currentTicketInfo.number,
        deskId: desk.id,
        userId: desk.user.id,
        userName: desk.user.displayName,
        serviceDuration,
        waitTime,
        completedTimestamp: Date.now(),
        service: desk.currentTicketInfo.service,
      };

      // Save to backend
      try {
        await api.history.addCompletedService({
          ticket_number: newCompletedService.ticketNumber,
          desk_id: newCompletedService.deskId,
          user_id: newCompletedService.userId,
          user_name: newCompletedService.userName,
          service_duration: newCompletedService.serviceDuration,
          wait_time: newCompletedService.waitTime,
          completed_timestamp: newCompletedService.completedTimestamp,
          service: newCompletedService.service,
        });
      } catch (error) {
        console.warn('⚠️ Erro ao salvar serviço completado:', error);
      }

      return {
        ...currentState,
        completedServices: [newCompletedService, ...currentState.completedServices],
      };
    } else {
      // Abandoned ticket (no-show)
      const calledInfo = [...currentState.calledHistory]
        .sort((a, b) => b.timestamp - a.timestamp)
        .find(t => t.ticketNumber === desk.currentTicketInfo?.number);

      const calledTimestamp = calledInfo ? calledInfo.timestamp : Date.now();

      const newAbandonedTicket: AbandonedTicket = {
        ticketNumber: desk.currentTicketInfo.number,
        deskId: desk.id,
        userId: desk.user.id,
        userName: desk.user.displayName,
        calledTimestamp: calledTimestamp,
        abandonedTimestamp: Date.now(),
        type: desk.currentTicketInfo.type,
        waitTime: calledTimestamp - desk.currentTicketInfo.dispenseTimestamp,
        service: desk.currentTicketInfo.service,
      };

      // Save to backend
      try {
        await api.history.addAbandonedTicket({
          ticket_number: newAbandonedTicket.ticketNumber,
          desk_id: newAbandonedTicket.deskId,
          user_id: newAbandonedTicket.userId,
          user_name: newAbandonedTicket.userName,
          called_timestamp: newAbandonedTicket.calledTimestamp,
          abandoned_timestamp: newAbandonedTicket.abandonedTimestamp,
          ticket_type: newAbandonedTicket.type,
          wait_time: newAbandonedTicket.waitTime,
          service: newAbandonedTicket.service,
        });
      } catch (error) {
        console.warn('⚠️ Erro ao salvar senha abandonada:', error);
      }

      return {
        ...currentState,
        abandonedTickets: [newAbandonedTicket, ...currentState.abandonedTickets],
      };
    }
  };

  const dispenseTicket = async (type: 'NORMAL' | 'PREFERENCIAL', service: ServiceType): Promise<string> => {
    try {
      // Call backend to create ticket
      const backendTicket = await api.tickets.create(type, service);
      const ticketNumber = backendTicket.ticket_number;

      // Update local state
      const newTicket: WaitingTicket = {
        number: ticketNumber,
        dispenseTimestamp: Date.now(),
        type,
        service
      };

      setState(prevState => {
        const sequenceNum = parseInt(ticketNumber.substring(1));
        return {
          ...prevState,
          nextNormalTicket: type === 'NORMAL' ? Math.max(prevState.nextNormalTicket, sequenceNum + 1) : prevState.nextNormalTicket,
          nextPreferentialTicket: type === 'PREFERENCIAL' ? Math.max(prevState.nextPreferentialTicket, sequenceNum + 1) : prevState.nextPreferentialTicket,
          waitingNormal: type === 'NORMAL' ? [...prevState.waitingNormal, newTicket] : prevState.waitingNormal,
          waitingPreferential: type === 'PREFERENCIAL' ? [...prevState.waitingPreferential, newTicket] : prevState.waitingPreferential,
        };
      });

      console.log(`✅ Senha ${ticketNumber} gerada e salva no banco de dados`);
      return ticketNumber;
    } catch (error) {
      console.error('❌ Erro ao gerar senha:', error);
      throw error;
    }
  };

  const callSpecificTicket = async (deskId: number, type: 'NORMAL' | 'PREFERENCIAL') => {
    // Get current state snapshot
    const prevState = state;
    const deskBeingUsed = prevState.desks.find(d => d.id === deskId);

    if (!deskBeingUsed || !deskBeingUsed.user || deskBeingUsed.services.length === 0) {
      return;
    }

    let stateAfterFinalizing = prevState;
    if (deskBeingUsed.currentTicketInfo) {
      // This updates backend and returns new state structure (but doesn't update React state yet)
      stateAfterFinalizing = await finalizeCurrentTicket(deskBeingUsed, prevState);
    }

    const { waitingPreferential, waitingNormal, desks } = stateAfterFinalizing;
    const deskServices = deskBeingUsed.services;

    let ticketToCall: WaitingTicket | undefined;
    let queueToSearch: WaitingTicket[];

    if (type === 'PREFERENCIAL') {
      queueToSearch = waitingPreferential;
    } else {
      queueToSearch = waitingNormal;
    }

    const ticketIndex = queueToSearch.findIndex(t => deskServices.includes(t.service));

    if (ticketIndex === -1) {
      // Update desk in backend
      try {
        await api.desks.update(deskId, {
          current_ticket: null,
          current_ticket_info: null,
          service_start_time: null,
        });
      } catch (error) {
        console.warn('⚠️ Erro ao atualizar mesa:', error);
      }

      const newDesks = desks.map(desk =>
        desk.id === deskId
          ? { ...desk, currentTicket: null, currentTicketInfo: null, serviceStartTime: null }
          : desk
      );

      setState({
        ...stateAfterFinalizing,
        desks: newDesks,
      });
      return;
    }

    ticketToCall = queueToSearch[ticketIndex];

    let newWaitingPreferential = [...waitingPreferential];
    let newWaitingNormal = [...waitingNormal];

    if (type === 'PREFERENCIAL') {
      newWaitingPreferential.splice(ticketIndex, 1);
    } else {
      newWaitingNormal.splice(ticketIndex, 1);
    }

    const newCalledTicket = {
      ticketNumber: ticketToCall.number,
      deskNumber: deskId,
      timestamp: Date.now(),
      type: ticketToCall.type,
    };

    // Save to backend
    try {
      await api.history.addCalledHistory({
        ticket_number: newCalledTicket.ticketNumber,
        desk_number: newCalledTicket.deskNumber,
        ticket_type: newCalledTicket.type,
        timestamp: newCalledTicket.timestamp,
      });

      await api.desks.update(deskId, {
        current_ticket: ticketToCall.number,
        current_ticket_info: ticketToCall,
        service_start_time: null,
      });

      // Update ticket status with additional info
      const callTime = Date.now();
      const waitTime = callTime - (ticketToCall.dispenseTimestamp || callTime);

      console.log('🔄 [FRONTEND] Atualizando status do ticket...');
      console.log('   Ticket:', ticketToCall.number);
      console.log('   Status:', 'CHAMANDO');
      console.log('   Call Time:', new Date(callTime).toISOString());
      console.log('   Wait Time:', waitTime);
      console.log('   Desk ID:', deskId);
      console.log('   Attendant:', deskBeingUsed.user?.displayName || 'Desconhecido');

      await api.tickets.updateStatus(ticketToCall.number, 'CHAMANDO', {
        call_time: new Date(callTime).toISOString(),
        wait_time: waitTime,
        desk_id: deskId,
        attendant_name: deskBeingUsed.user?.displayName || 'Desconhecido'
      });

      console.log('✅ [FRONTEND] Status atualizado com sucesso!');
    } catch (error) {
      console.error('❌ [FRONTEND] Erro ao salvar chamada:', error);
      console.error('   Detalhes:', error instanceof Error ? error.message : error);
    }

    const newCalledHistory = [newCalledTicket, ...stateAfterFinalizing.calledHistory];
    const newDesks = desks.map(desk =>
      desk.id === deskId
        ? { ...desk, currentTicket: ticketToCall!.number, currentTicketInfo: ticketToCall, serviceStartTime: null }
        : desk
    );

    setState({
      ...stateAfterFinalizing,
      waitingNormal: newWaitingNormal,
      waitingPreferential: newWaitingPreferential,
      calledHistory: newCalledHistory,
      desks: newDesks,
    });
  };

  const login = async (deskId: number, user: { id: string; displayName: string }, services: ServiceType[]) => {
    try {
      await api.desks.update(deskId, {
        user_id: user.id,
        user_display_name: user.displayName,
        services,
      });

      setState(prevState => ({
        ...prevState,
        desks: prevState.desks.map(desk => desk.id === deskId ? { ...desk, user, services } : desk),
      }));
    } catch (error) {
      console.warn('⚠️ Erro ao fazer login na mesa:', error);
    }
  };

  const logout = async (deskId: number) => {
    const prevState = state;
    const deskToLogout = prevState.desks.find(d => d.id === deskId);
    let stateAfterFinalizing = prevState;

    if (deskToLogout) {
      stateAfterFinalizing = await finalizeCurrentTicket(deskToLogout, prevState);
    }

    try {
      await api.desks.update(deskId, {
        user_id: null,
        user_display_name: null,
        current_ticket: null,
        current_ticket_info: null,
        service_start_time: null,
        services: [],
      });
    } catch (error) {
      console.warn('⚠️ Erro ao fazer logout da mesa:', error);
    }

    setState({
      ...stateAfterFinalizing,
      desks: stateAfterFinalizing.desks.map(desk =>
        desk.id === deskId
          ? { ...desk, user: null, currentTicket: null, currentTicketInfo: null, serviceStartTime: null, services: [] }
          : desk
      ),
    });
  };

  const startService = async (deskId: number) => {
    const startTime = Date.now();
    const desk = state.desks.find(d => d.id === deskId);

    // Atualizar status do ticket para EM_ATENDIMENTO
    if (desk?.currentTicketInfo) {
      try {
        await api.tickets.updateStatus(desk.currentTicketInfo.number, 'EM_ATENDIMENTO');
        console.log(`✅ Status do ticket ${desk.currentTicketInfo.number} atualizado para EM_ATENDIMENTO`);
      } catch (error) {
        console.error('❌ Erro ao atualizar status do ticket:', error);
      }
    }

    try {
      await api.desks.update(deskId, {
        service_start_time: startTime,
      });

      setState(prevState => ({
        ...prevState,
        desks: prevState.desks.map(desk => desk.id === deskId ? { ...desk, serviceStartTime: startTime } : desk),
      }));
    } catch (error) {
      console.warn('⚠️ Erro ao iniciar serviço:', error);
    }
  };

  const endService = async (deskId: number) => {
    const prevState = state;
    const deskToEnd = prevState.desks.find(d => d.id === deskId);
    if (!deskToEnd || !deskToEnd.currentTicketInfo || !deskToEnd.serviceStartTime) {
      return;
    }

    // Atualizar status do ticket para ATENDIDA
    try {
      await api.tickets.updateStatus(deskToEnd.currentTicketInfo.number, 'ATENDIDA');
      console.log(`✅ Status do ticket ${deskToEnd.currentTicketInfo.number} atualizado para ATENDIDA`);
    } catch (error) {
      console.error('❌ Erro ao atualizar status do ticket:', error);
    }

    const stateAfterFinalizing = await finalizeCurrentTicket(deskToEnd, prevState);

    try {
      await api.desks.update(deskId, {
        current_ticket: null,
        current_ticket_info: null,
        service_start_time: null,
      });
    } catch (error) {
      console.warn('⚠️ Erro ao finalizar serviço:', error);
    }

    const newDesks = stateAfterFinalizing.desks.map(desk =>
      desk.id === deskId
        ? { ...desk, currentTicket: null, currentTicketInfo: null, serviceStartTime: null }
        : desk
    );

    setState({
      ...stateAfterFinalizing,
      desks: newDesks
    });
  };

  const resetSystem = () => {
    if (window.confirm("Tem certeza que deseja reiniciar o sistema? Os dados de hoje serão arquivados e uma nova sessão será iniciada.")) {
      // In the new system, we just clear local state
      // Backend data remains for historical purposes
      setState({ ...initialState, tips: state.tips, alertMessage: state.alertMessage, agenda: state.agenda });
      console.log('✅ Sistema reiniciado');
    }
  };

  const reinsertTicket = async (ticketNumber: string): Promise<ReinsertResult> => {
    const upperCaseTicketNumber = ticketNumber.toUpperCase();

    console.log('🔍 [REINSERT] Procurando senha:', upperCaseTicketNumber);
    console.log('🔍 [REINSERT] Total de senhas abandonadas no estado:', state.abandonedTickets.length);
    console.log('🔍 [REINSERT] Senhas abandonadas:', state.abandonedTickets.map(t => t.ticketNumber));

    // Check if already completed
    const completedTicket = state.completedServices.find(t => t.ticketNumber.toUpperCase() === upperCaseTicketNumber);
    if (completedTicket) {
      return {
        success: false,
        message: `Essa senha já foi atendida.`,
        details: {
          deskId: completedTicket.deskId,
          user: completedTicket.userName,
          timestamp: completedTicket.completedTimestamp,
        }
      };
    }

    // Find in abandoned
    const ticketToReinsert = state.abandonedTickets.find(t => t.ticketNumber.toUpperCase() === upperCaseTicketNumber);
    if (!ticketToReinsert) {
      return {
        success: false,
        message: 'Senha não encontrada na lista de abandonadas ou inválida.'
      };
    }

    try {
      // Remove from abandoned in backend
      await api.history.removeAbandonedTicket(upperCaseTicketNumber);

      // Create new ticket
      await api.tickets.create(ticketToReinsert.type as any, ticketToReinsert.service as ServiceType);

      // Update local state
      setState(prevState => {
        const newWaitingTicket: WaitingTicket = {
          number: ticketToReinsert.ticketNumber,
          type: ticketToReinsert.type as any,
          service: ticketToReinsert.service as ServiceType,
          dispenseTimestamp: Date.now(),
        };

        const newAbandoned = prevState.abandonedTickets.filter(t => t.ticketNumber.toUpperCase() !== upperCaseTicketNumber);

        if (newWaitingTicket.type === 'NORMAL') {
          return {
            ...prevState,
            abandonedTickets: newAbandoned,
            waitingNormal: [...prevState.waitingNormal, newWaitingTicket],
          };
        } else {
          return {
            ...prevState,
            abandonedTickets: newAbandoned,
            waitingPreferential: [...prevState.waitingPreferential, newWaitingTicket],
          };
        }
      });

      return { success: true, message: `Senha ${upperCaseTicketNumber} reinserida na fila com sucesso.` };
    } catch (error) {
      console.error('❌ Erro ao reinserir senha:', error);
      return { success: false, message: 'Erro ao reinserir senha.' };
    }
  };

  const updateTips = async (newTips: string[]) => {
    try {
      await api.config.update('tips', JSON.stringify(newTips));
      setState(prevState => ({ ...prevState, tips: newTips }));
    } catch (error) {
      console.warn('⚠️ Erro ao atualizar dicas:', error);
    }
  };

  const setAlertMessage = async (message: string) => {
    try {
      await api.config.update('alert_message', message);
      setState(prevState => ({ ...prevState, alertMessage: message }));
    } catch (error) {
      console.warn('⚠️ Erro ao definir mensagem de alerta:', error);
    }
  };

  const clearAlertMessage = async () => {
    try {
      await api.config.update('alert_message', '');
      setState(prevState => ({ ...prevState, alertMessage: null }));
    } catch (error) {
      console.warn('⚠️ Erro ao limpar mensagem de alerta:', error);
    }
  };

  const addAgendaEntry = async (entryData: Omit<AgendaEntry, 'id' | 'data_do_registro' | 'status'>): Promise<void> => {
    const newEntry: AgendaEntry = {
      ...entryData,
      id: `AGENDA-${Date.now()}-${entryData.ticketNumber}`,
      data_do_registro: Date.now(),
      status: 'AGENDADO',
    };

    try {
      await api.agenda.create({
        id: newEntry.id,
        ticket_number: newEntry.ticketNumber,
        nome_completo: newEntry.nomeCompleto,
        cpf: newEntry.cpf,
        telefone: newEntry.telefone,
        email: newEntry.email,
        data_agendamento: newEntry.dataAgendamento,
        horario: newEntry.horario,
        servico: newEntry.servico,
        observacoes: newEntry.observacoes,
        documentos_necessarios: newEntry.documentosNecessarios,
        data_do_registro: newEntry.data_do_registro,
      });

      setState(prevState => ({
        ...prevState,
        agenda: [...prevState.agenda, newEntry],
      }));
    } catch (error) {
      console.error('❌ Erro ao adicionar agendamento:', error);
      throw error;
    }
  };

  const updateAgendaEntry = async (updatedEntry: AgendaEntry): Promise<void> => {
    try {
      await api.agenda.update(updatedEntry.id, {
        nome_completo: updatedEntry.nomeCompleto,
        cpf: updatedEntry.cpf,
        telefone: updatedEntry.telefone,
        email: updatedEntry.email,
        data_agendamento: updatedEntry.dataAgendamento,
        horario: updatedEntry.horario,
        servico: updatedEntry.servico,
        observacoes: updatedEntry.observacoes,
        documentos_necessarios: updatedEntry.documentosNecessarios,
        status: updatedEntry.status,
      });

      setState(prevState => ({
        ...prevState,
        agenda: prevState.agenda.map(entry =>
          entry.id === updatedEntry.id ? updatedEntry : entry
        ),
      }));
    } catch (error) {
      console.error('❌ Erro ao atualizar agendamento:', error);
      throw error;
    }
  };

  const cancelAgendaEntry = async (entryId: string) => {
    try {
      await api.agenda.cancel(entryId);

      setState(prevState => ({
        ...prevState,
        agenda: prevState.agenda.map(entry =>
          entry.id === entryId ? { ...entry, status: 'CANCELADO' as AgendaEntry['status'] } : entry
        ),
      }));
    } catch (error) {
      console.warn('⚠️ Erro ao cancelar agendamento:', error);
    }
  };

  const recallTicket = async (deskId: number) => {
    const desk = state.desks.find(d => d.id === deskId);
    if (!desk || !desk.currentTicketInfo) return;

    try {
      const now = Date.now();
      const nowISO = new Date(now).toISOString();

      // Atualizar status do ticket
      await api.tickets.updateStatus(desk.currentTicketInfo.number, 'CHAMANDO', {
        call_time: nowISO,
        desk_id: deskId,
        attendant_name: desk.user?.displayName
      });

      // Adicionar ao histórico de chamadas com novo timestamp
      const newCalledTicket = {
        ticketNumber: desk.currentTicketInfo.number,
        deskNumber: deskId,
        timestamp: now,
        type: desk.currentTicketInfo.type,
      };

      await api.history.addCalledHistory({
        ticket_number: newCalledTicket.ticketNumber,
        desk_number: newCalledTicket.deskNumber,
        ticket_type: newCalledTicket.type,
        timestamp: newCalledTicket.timestamp,
      });

      // Atualizar estado local com novo timestamp de chamada
      setState(prev => ({
        ...prev,
        calledHistory: [newCalledTicket, ...prev.calledHistory],
        desks: prev.desks.map(d =>
          d.id === deskId && d.currentTicketInfo
            ? {
              ...d,
              currentTicketInfo: {
                ...d.currentTicketInfo,
                dispenseTimestamp: d.currentTicketInfo.dispenseTimestamp // Mantém o timestamp original
              }
            }
            : d
        )
      }));

      console.log(`✅ Senha ${desk.currentTicketInfo.number} rechamada - Novo timestamp: ${now}`);
    } catch (error) {
      console.error('Erro ao rechamar senha:', error);
    }
  };

  const abandonTicket = async (deskId: number) => {
    const desk = state.desks.find(d => d.id === deskId);
    if (!desk || !desk.currentTicketInfo || !desk.user) return;

    try {
      // Buscar informações da chamada
      const calledInfo = [...state.calledHistory]
        .sort((a, b) => b.timestamp - a.timestamp)
        .find(t => t.ticketNumber === desk.currentTicketInfo?.number);

      const calledTimestamp = calledInfo ? calledInfo.timestamp : Date.now();
      const abandonedTimestamp = Date.now();
      const waitTime = calledTimestamp - desk.currentTicketInfo.dispenseTimestamp;

      // Atualizar status do ticket para ABANDONADA
      await api.tickets.updateStatus(desk.currentTicketInfo.number, 'ABANDONADA');
      console.log(`✅ Status do ticket ${desk.currentTicketInfo.number} atualizado para ABANDONADA`);

      // Adicionar ao histórico de abandonadas
      const newAbandonedTicket = {
        ticketNumber: desk.currentTicketInfo.number,
        deskId: desk.id,
        userId: desk.user.id,
        userName: desk.user.displayName,
        calledTimestamp,
        abandonedTimestamp,
        type: desk.currentTicketInfo.type,
        waitTime,
        service: desk.currentTicketInfo.service,
      };

      await api.history.addAbandonedTicket({
        ticket_number: newAbandonedTicket.ticketNumber,
        desk_id: newAbandonedTicket.deskId,
        user_id: newAbandonedTicket.userId,
        user_name: newAbandonedTicket.userName,
        called_timestamp: newAbandonedTicket.calledTimestamp,
        abandoned_timestamp: newAbandonedTicket.abandonedTimestamp,
        ticket_type: newAbandonedTicket.type,
        wait_time: newAbandonedTicket.waitTime,
        service: newAbandonedTicket.service
      });

      // Limpar mesa
      await api.desks.update(deskId, {
        current_ticket: null,
        current_ticket_info: null,
        service_start_time: null
      });

      // Atualizar estado local
      setState(prev => ({
        ...prev,
        abandonedTickets: [newAbandonedTicket, ...prev.abandonedTickets],
        desks: prev.desks.map(d =>
          d.id === deskId
            ? { ...d, currentTicket: null, currentTicketInfo: null, serviceStartTime: null }
            : d
        )
      }));

      console.log(`✅ Senha ${desk.currentTicketInfo.number} abandonada`);

      // Sincronizar estado com backend para garantir que a senha apareça na lista de abandonadas
      await refreshState();
    } catch (error) {
      console.error('Erro ao abandonar senha:', error);
    }
  };

  return (
    <QueueContext.Provider value={{
      state,
      dispenseTicket,
      callSpecificTicket,
      login,
      logout,
      startService,
      endService,
      resetSystem,
      reinsertTicket,
      updateTips,
      setAlertMessage,
      clearAlertMessage,
      addAgendaEntry,
      updateAgendaEntry,
      cancelAgendaEntry,
      refreshState,
      recallTicket,
      abandonTicket,
    }}>
      {children}
    </QueueContext.Provider>
  );
};