import React, { useState, useEffect, useMemo } from 'react';
import { useQueue } from '../hooks/useQueue';
import { ServiceType, ServiceTypeDetails, ServiceDesk as ServiceDeskType } from '../types';
import { useAuth } from '../hooks/useAuth';
import { AgendaModal } from './AgendaModal';

const getDisplayName = (fullName: string): string => {
  if (!fullName) return '';
  const names = fullName.trim().split(' ');
  if (names.length === 1) return names[0];
  return `${names[0]} ${names[names.length - 1]}`;
};

export const ServiceDesk: React.FC = () => {
  const { state, login, logout, callSpecificTicket, startService, endService, recallTicket, abandonTicket } = useQueue();
  const { currentUser } = useAuth();

  const [selectedDeskId, setSelectedDeskId] = useState<number | null>(null);
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);
  const [view, setView] = useState<'return' | 'select_desk'>('return');

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);

  // Countdown / auto-recall state
  const WAIT_SECONDS = 15;
  const MAX_CALLS = 3;
  const [callCount, setCallCount] = useState(1);
  const [countdown, setCountdown] = useState(WAIT_SECONDS);
  const [isAutoRecalling, setIsAutoRecalling] = useState(false);

  const loggedInDesk = state.desks.find(d => d.user?.id === currentUser?.id);
  const isServiceActive = loggedInDesk?.serviceStartTime !== null;

  const myActiveDesk = state.desks.find(d => d.user?.id === currentUser?.id);
  const availableDesks = state.desks.filter(d => !d.user);

  const { pendingPreferential, pendingNormal } = useMemo(() => {
    if (!loggedInDesk) return { pendingPreferential: 0, pendingNormal: 0 };
    const deskServices = loggedInDesk.services;
    const pendingPreferential = state.waitingPreferential.filter(t => deskServices.includes(t.service)).length;
    const pendingNormal = loggedInDesk.preferentialOnly 
      ? 0 
      : state.waitingNormal.filter(t => deskServices.includes(t.service)).length;
    return { pendingPreferential, pendingNormal };
  }, [state.waitingPreferential, state.waitingNormal, loggedInDesk]);


  useEffect(() => {
    if (!isServiceActive || !loggedInDesk?.serviceStartTime) {
      setElapsedTime(0);
      return;
    }

    const intervalId = setInterval(() => {
      setElapsedTime(Date.now() - (loggedInDesk.serviceStartTime ?? 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isServiceActive, loggedInDesk?.serviceStartTime]);

  // Reset countdown and callCount whenever a NEW ticket is shown on the desk
  const currentTicketNumber = loggedInDesk?.currentTicketInfo?.number;
  useEffect(() => {
    if (currentTicketNumber && !loggedInDesk?.serviceStartTime) {
      setCountdown(WAIT_SECONDS);
      // callCount is managed externally (recall/abandon), only reset on NEW ticket
    } else if (!currentTicketNumber) {
      setCallCount(1);
      setCountdown(WAIT_SECONDS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTicketNumber]);

  // Countdown tick + auto-recall / auto-abandon
  useEffect(() => {
    if (!loggedInDesk?.currentTicketInfo || loggedInDesk.serviceStartTime || isAutoRecalling) return;

    if (countdown <= 0) {
      // Time's up
      setIsAutoRecalling(true);
      if (callCount >= MAX_CALLS) {
        // Mark as no-show
        if (loggedInDesk) abandonTicket(loggedInDesk.id).finally(() => setIsAutoRecalling(false));
      } else {
        // Auto-recall
        if (loggedInDesk) {
          recallTicket(loggedInDesk.id).finally(() => {
            setCallCount(prev => prev + 1);
            setCountdown(WAIT_SECONDS);
            setIsAutoRecalling(false);
          });
        }
      }
      return;
    }

    const id = window.setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown, loggedInDesk, isAutoRecalling, callCount, recallTicket, abandonTicket]);

  useEffect(() => {
    if (myActiveDesk) {
      setView('return');
    } else {
      setView('select_desk');
    }
  }, [myActiveDesk]);

  const pendingCounts = useMemo(() => {
    if (!loggedInDesk) return {} as Record<ServiceType, number>;

    const counts: Record<ServiceType, number> = {
      'TRIAGEM': 0,
      'ATERMACAO': 0,
      'ATENDIMENTO': 0,
    };

    const allWaiting = [...state.waitingNormal, ...state.waitingPreferential];

    for (const service of loggedInDesk.services) {
      counts[service] = allWaiting.filter(ticket => ticket.service === service).length;
    }

    return counts;

  }, [state.waitingNormal, state.waitingPreferential, loggedInDesk]);

  const handleServiceSelectionChange = (service: ServiceType) => {
    setSelectedServices(prev => {
      if (prev.includes(service)) {
        return prev.filter(s => s !== service);
      } else {
        return [...prev, service];
      }
    });
  };

  const handleDeskLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDeskId && currentUser && selectedServices.length > 0) {
      const user = { id: currentUser.id, displayName: getDisplayName(currentUser.fullName) };
      login(selectedDeskId, user, selectedServices);
    } else if (selectedServices.length === 0) {
      alert("Por favor, selecione ao menos um tipo de serviço para atender.");
    }
  };

  const handleLogout = () => {
    if (loggedInDesk) {
      logout(loggedInDesk.id);
      setSelectedDeskId(null);
      setSelectedServices([]);
      setView('select_desk');
    }
  };

  const handleStartService = () => {
    if (loggedInDesk?.currentTicketInfo) {
      startService(loggedInDesk.id);
      if (loggedInDesk.currentTicketInfo.service === 'TRIAGEM') {
        setIsAgendaModalOpen(true);
      }
    }
  };

  const handleEndService = () => {
    if (loggedInDesk) {
      endService(loggedInDesk.id);
    }
  };

  const handleCallNormal = () => {
    if (loggedInDesk) {
      callSpecificTicket(loggedInDesk.id, 'NORMAL');
    }
  };

  const handleCallPreferential = () => {
    if (loggedInDesk) {
      callSpecificTicket(loggedInDesk.id, 'PREFERENCIAL');
    }
  };

  const handleRecall = async () => {
    if (!loggedInDesk) return;
    if (callCount >= MAX_CALLS) {
      // Already at limit — treat as no-show
      await abandonTicket(loggedInDesk.id);
      setCallCount(1);
      setCountdown(WAIT_SECONDS);
    } else {
      await recallTicket(loggedInDesk.id);
      setCallCount(prev => prev + 1);
      setCountdown(WAIT_SECONDS);
    }
  };

  const handleCallNext = async () => {
    if (loggedInDesk) {
      await abandonTicket(loggedInDesk.id);
      setCallCount(1);
      setCountdown(WAIT_SECONDS);
    }
  };

  const handleReturnToDesk = () => {
    if (myActiveDesk) {
      setSelectedDeskId(myActiveDesk.id);
    }
  };

  const switchToLoginView = () => {
    setSelectedDeskId(null);
    setSelectedServices([]);
    setView('select_desk');
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  if (!currentUser) {
    return <div>Carregando...</div>;
  }

  if (loggedInDesk) {
    const isWaitingForAttendantAction = loggedInDesk.currentTicketInfo && !isServiceActive;

    return (
      <>
        <div className="flex justify-center items-start h-full p-4 pt-0 bg-black">
          <div className="w-full max-w-5xl bg-gray-900 rounded-xl grid grid-cols-1 lg:grid-cols-3 gap-4 h-auto min-h-[80vh]">

            {/* Coluna Principal de Ações */}
            <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 flex flex-col justify-between border border-gray-700">
              <div className="text-center">
                <p className="text-xl text-white font-semibold">Senha Chamada</p>
                <p className="text-7xl md:text-8xl font-mono font-extrabold text-white my-2 leading-tight">
                  {loggedInDesk.currentTicketInfo?.number || '----'}
                </p>
                {loggedInDesk.currentTicketInfo && (
                  <>
                    <p className="text-xl text-gray-300 font-semibold -mt-2 mb-2">
                      Serviço: {ServiceTypeDetails[loggedInDesk.currentTicketInfo.service].title}
                    </p>
                    
                    {loggedInDesk.currentTicketInfo.observations && (
                      <div className="bg-blue-900/40 border border-blue-500/50 p-4 rounded-lg mb-4 max-w-xl mx-auto text-left">
                        <p className="text-blue-300 text-xs font-bold uppercase mb-1 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                          Observação do Cidadão:
                        </p>
                        <p className="text-white text-md italic">
                          "{loggedInDesk.currentTicketInfo.observations}"
                        </p>
                      </div>
                    )}
                  </>
                )}
                {loggedInDesk.currentTicketInfo && !isServiceActive && (
                  <div className="flex flex-col items-center gap-2 mb-4">
                    {/* Countdown ring */}
                    <div className={`relative flex items-center justify-center w-24 h-24 rounded-full border-4 ${
                      countdown <= 5 ? 'border-red-500' : countdown <= 10 ? 'border-yellow-400' : 'border-gray-500'
                    } transition-colors duration-500`}>
                      <div className="text-center">
                        <span className={`text-3xl font-mono font-bold ${
                          countdown <= 5 ? 'text-red-400' : countdown <= 10 ? 'text-yellow-300' : 'text-gray-200'
                        }`}>{countdown}</span>
                        <p className="text-xs text-gray-400 leading-none">seg</p>
                      </div>
                    </div>
                    {/* Call attempt dots */}
                    <div className="flex items-center gap-2">
                      {Array.from({ length: MAX_CALLS }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                            i < callCount ? 'bg-yellow-400' : 'bg-gray-600'
                          }`}
                          title={`Chamada ${i + 1}`}
                        />
                      ))}
                      <span className="text-xs text-gray-400 ml-1">chamada {callCount}/{MAX_CALLS}</span>
                    </div>
                  </div>
                )}
                {isServiceActive && (
                  <div className="flex items-center justify-center gap-2 text-white text-xl font-medium bg-gray-700 px-3 py-1 rounded-full w-auto mx-auto mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span>Duração:</span>
                    <span className="font-mono">{formatTime(elapsedTime)}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                {loggedInDesk.currentTicketInfo && (
                  isServiceActive ? (
                    <button onClick={handleEndService} className="w-full bg-green-600 text-white font-bold py-4 rounded-lg text-xl hover:bg-green-700 transition-colors duration-300 shadow-md">
                      Encerrar Atendimento
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <button onClick={handleStartService} className="w-full bg-red-600 text-white font-bold py-4 rounded-lg text-xl hover:bg-red-700 transition-transform transform hover:scale-105 duration-300 shadow-md">
                        Iniciar Atendimento
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={handleRecall}
                          disabled={isAutoRecalling}
                          className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                          {callCount >= MAX_CALLS ? 'Não Compareceu' : `Chamar Novamente (${callCount}/${MAX_CALLS})`}
                        </button>
                        <button onClick={handleCallNext} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="m9 18 6-6-6-6" /></svg>
                          Não Compareceu
                        </button>
                      </div>
                    </div>
                  )
                )}
                {!isServiceActive && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={handleCallPreferential}
                      disabled={pendingPreferential === 0}
                      className="w-full font-bold py-4 px-2 rounded-lg text-lg transition-transform transform hover:scale-105 duration-300 shadow-md flex flex-col items-center justify-center bg-yellow-500 hover:bg-yellow-600 text-gray-900 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <span>Chamar Preferencial</span>
                      <span className="text-2xl font-black">{pendingPreferential}</span>
                    </button>
                    <button
                      onClick={handleCallNormal}
                      disabled={pendingNormal === 0 || loggedInDesk.preferentialOnly}
                      className="w-full font-bold py-4 px-2 rounded-lg text-lg transition-transform transform hover:scale-105 duration-300 shadow-md flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <span>{loggedInDesk.preferentialOnly ? 'Normal Restrito' : 'Chamar Normal'}</span>
                      <span className="text-2xl font-black">{loggedInDesk.preferentialOnly ? '--' : pendingNormal}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Lateral de Informações */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-3">Serviços</h2>
                <div className="flex flex-wrap gap-2">
                  {loggedInDesk.services.map(s => (
                    <span key={s} className="px-3 py-1 bg-gray-700 rounded-md text-sm text-gray-300 border border-gray-600 font-medium">
                      {ServiceTypeDetails[s].title}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex-grow">
                <h3 className="text-md font-semibold text-white mb-3 text-center">Senhas em Espera</h3>
                <div className="flex flex-col justify-center space-y-3 h-full">
                  {loggedInDesk.services.length > 0 ? (
                    loggedInDesk.services.map(service => (
                      <div key={service} className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                        <p className="text-base text-gray-300">{ServiceTypeDetails[service].title}</p>
                        <p className="text-2xl font-bold text-white bg-gray-700 rounded-md px-3 py-1 min-w-[3rem] text-center">
                          {pendingCounts[service] ?? 0}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center text-sm">Nenhum serviço selecionado.</p>
                  )}
                </div>
              </div>

              <button onClick={() => setIsAgendaModalOpen(true)} className="bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
                Novo Agendamento
              </button>

              <button onClick={handleLogout} className="bg-red-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-red-700 transition-colors duration-300 flex items-center justify-center gap-1.5 mt-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Sair da Mesa
              </button>
            </div>

          </div>
        </div>
        {isAgendaModalOpen && currentUser && (
          <AgendaModal
            onClose={() => setIsAgendaModalOpen(false)}
            attendant={{ id: currentUser.id, name: getDisplayName(currentUser.fullName) }}
            ticketNumber={loggedInDesk.currentTicketInfo?.number ?? 'MANUAL'}
          />
        )}
      </>
    );
  }

  if (myActiveDesk && view === 'return') {
    return (
      <div className="flex items-center justify-center h-full p-4 bg-black">
        <div className="w-full max-w-sm p-8 bg-gray-900 rounded-xl text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Bem-vindo(a) de volta!</h2>
          <p className="text-gray-400 mb-8">Você já está logado na Mesa {myActiveDesk.id}.</p>
          <button
            onClick={handleReturnToDesk}
            className="w-full bg-red-600 text-white font-bold py-4 rounded-xl text-xl hover:bg-red-700 transition-colors duration-300 shadow-lg"
          >
            Retornar à Mesa
          </button>
          <div className="mt-8 text-center border-t border-gray-700 pt-6">
            <button
              onClick={switchToLoginView}
              className="text-red-400 hover:underline"
            >
              Não é sua mesa? Fazer novo login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Select Desk form
  return (
    <div className="flex items-center justify-center h-full p-4 bg-black">
      <form onSubmit={handleDeskLogin} className="w-full max-w-2xl p-8 bg-gray-900 rounded-xl relative">
        <h2 className="text-2xl font-bold text-center text-white mb-2">Login da Mesa de Atendimento</h2>
        <p className="text-center text-gray-400 mb-8">Olá, {getDisplayName(currentUser.fullName)}!</p>
        <div className="mb-4">
          <label htmlFor="desk" className="block text-gray-300 text-sm font-bold mb-2">
            Número da Mesa
          </label>
          <select
            id="desk"
            onChange={(e) => setSelectedDeskId(Number(e.target.value))}
            value={selectedDeskId ?? ''}
            required
            className="bg-gray-800 shadow-sm appearance-none border border-gray-700 rounded-lg w-full py-3 px-4 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="" disabled>Selecione uma mesa</option>
            {state.desks.map(desk => {
              const isOccupied = !!desk.user;
              const attendantName = isOccupied ? getDisplayName(desk.user?.displayName || '') : '';
              
              return (
                <option key={desk.id} value={desk.id} disabled={isOccupied}>
                  Mesa {desk.id} {isOccupied ? `(Ocupada por ${attendantName})` : ''}
                </option>
              );
            })}
          </select>
        </div>
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-bold mb-2">
            Tipos de Atendimento
          </label>
          <div className="space-y-2 mt-2">
            {Object.entries(ServiceTypeDetails).map(([key, { title }]) => {
              const serviceType = key as ServiceType;
              return (
                <label key={key} className="flex items-center space-x-3 bg-gray-800 p-3 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                  <input
                    type="checkbox"
                    value={serviceType}
                    checked={selectedServices.includes(serviceType)}
                    onChange={() => handleServiceSelectionChange(serviceType)}
                    className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500 focus:ring-offset-gray-900"
                  />
                  <span className="text-white">{title}</span>
                </label>
              );
            })}
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-transform transform hover:scale-105 duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
          disabled={!selectedDeskId || selectedServices.length === 0}
        >
          Entrar na Mesa
        </button>
      </form>
    </div>
  );
};