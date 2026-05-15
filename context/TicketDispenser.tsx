import React, { useState } from 'react';
import { useQueue } from '../hooks/useQueue';
import { ServiceType, ServiceTypeDetails, AgendaEntry } from '../types';
import { ServerStatusIndicator } from '../components/ServerStatusIndicator';

declare global {
  interface Window {
    jspdf: any;
  }
}

// Helper to format date to DD/MM/YYYY
const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
};

// Define colors for each service type
const serviceColors: Record<ServiceType, { border: string; hoverBg: string; text: string }> = {
  'TRIAGEM': {
    border: 'border-blue-500 hover:border-blue-400',
    hoverBg: 'hover:bg-gray-700',
    text: 'text-blue-300'
  },
  'ATERMACAO': {
    border: 'border-orange-500 hover:border-orange-400',
    hoverBg: 'hover:bg-gray-700',
    text: 'text-orange-300'
  },
  'ATENDIMENTO': {
    border: 'border-green-500 hover:border-green-400',
    hoverBg: 'hover:bg-gray-700',
    text: 'text-green-300'
  }
};

interface ValidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: () => void;
    onInputChange: (value: string) => void;
    input: string;
    error: string | null;
    foundAppointment: AgendaEntry | null;
    onDispense: (service: ServiceType, appointment?: AgendaEntry) => void;
    isDispensing: boolean;
    observations: string;
    onObservationsChange: (value: string) => void;
}

const ValidationModal: React.FC<ValidationModalProps> = ({ 
    isOpen, onClose, onSearch, onInputChange, input, error, foundAppointment, onDispense, isDispensing, observations, onObservationsChange
}) => {
  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];
  const isToday = foundAppointment?.data_retorno === today;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-lg border-2 border-orange-500 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h3 className="text-2xl font-bold text-orange-400 mb-2">Validação de Agendamento</h3>
        <p className="text-gray-400 mb-6 text-sm">Insira o número do agendamento ou CPF para localizar seu horário.</p>
        
        <div className="space-y-4">
          <div>
            <input
              type="text"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Nº Agendamento ou CPF"
              autoFocus
              className="w-full bg-gray-900 text-white border-2 border-gray-700 p-4 rounded-xl text-xl text-center focus:border-orange-500 outline-none transition-colors"
              onKeyPress={(e) => e.key === 'Enter' && onSearch()}
            />
          </div>

          {!foundAppointment ? (
            <>
              <button onClick={onSearch} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl transition-colors shadow-lg">
                BUSCAR AGENDAMENTO
              </button>
              
              {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg text-sm">
                  <p className="font-bold mb-2">Atenção!</p>
                  <p>{error}</p>
                  <div className="mt-4 flex flex-col gap-2">
                      <button onClick={() => onDispense('ATENDIMENTO')} className="text-white bg-blue-600 hover:bg-blue-700 font-bold py-3 rounded-lg text-xs uppercase tracking-wider">
                          Emitir Senha para Atendimento Comum
                      </button>
                      <button onClick={onClose} className="text-gray-400 hover:text-white text-xs underline">
                          Tentar novamente ou escolher outro serviço
                      </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl text-left">
              <p className="text-green-400 font-black text-xs uppercase mb-2">Agendamento Localizado!</p>
              <p className="text-white font-bold text-lg">{foundAppointment.nome}</p>
              <p className="text-gray-300 text-sm">Data: <span className={isToday ? "text-white font-bold" : "text-red-400 font-bold"}>{formatDateBR(foundAppointment.data_retorno)}</span> às {foundAppointment.hora_retorno}</p>
              <p className="text-gray-400 text-sm italic mt-1">{foundAppointment.local_retorno}</p>
              <div className="mt-4">
                <label className="text-xs font-bold text-gray-400 uppercase">Observações (Opcional)</label>
                <textarea
                  value={observations}
                  onChange={(e) => onObservationsChange(e.target.value)}
                  placeholder="Ex: Processo nº 123... ou Dúvida sobre X"
                  className="w-full mt-1 bg-gray-700 text-white p-3 rounded-lg text-sm focus:border-green-500 outline-none"
                  rows={2}
                />
              </div>
              
              {!isToday ? (
                <div className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded-lg">
                  <p className="text-red-200 text-sm font-bold mb-2">Data Divergente!</p>
                  <p className="text-red-300 text-xs">Seu agendamento não é para hoje. Por favor, dirija-se à triagem para reagendar ou atualizar seu horário antes de emitir a senha.</p>
                  <button onClick={onClose} className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg text-sm">
                    VOLTAR
                  </button>
                </div>
              ) : (
                <button onClick={() => onDispense('ATERMACAO', foundAppointment)} disabled={isDispensing} className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl text-lg shadow-xl transform transition hover:scale-105 disabled:opacity-50">
                  {isDispensing ? 'EMITINDO...' : 'CONFIRMAR E EMITIR SENHA'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const TicketDispenser: React.FC = () => {
  const { dispenseTicket, reinsertTicket, updateAgendaEntry, state } = useQueue();
  const [step, setStep] = useState<'type' | 'service' | 'reinsert' | 'confirmation' | 'observations'>('type');
  const [selectedType, setSelectedType] = useState<'NORMAL' | 'PREFERENCIAL' | null>(null);
  const [lastTicket, setLastTicket] = useState<{ number: string; service: ServiceType } | null>(null);
  const [isDispensing, setIsDispensing] = useState(false);
  const [reinsertTicketNumber, setReinsertTicketNumber] = useState('');
  const [reinsertMessage, setReinsertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationInput, setValidationInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [foundAppointment, setFoundAppointment] = useState<AgendaEntry | null>(null);
  const [pendingService, setPendingService] = useState<ServiceType | null>(null);
  const [observations, setObservations] = useState('');

  const handleTypeSelect = (type: 'NORMAL' | 'PREFERENCIAL') => {
    setSelectedType(type);
    setStep('service');
  };

  const handleServiceSelect = (service: ServiceType) => {
    if (isDispensing || !selectedType) return;
    
    setPendingService(service);
    setObservations(''); // Reset observations

    if (service === 'ATERMACAO') {
      setIsValidationModalOpen(true);
      setValidationInput('');
      setValidationError(null);
      setFoundAppointment(null);
      return;
    }

    setStep('observations');
  };

  const executeDispense = async (service: ServiceType, appointment?: AgendaEntry) => {
    setIsDispensing(true);
    try {
      // If there's an appointment, mark it as COMPARECEU
      if (appointment) {
          await updateAgendaEntry({
              ...appointment,
              status: 'COMPARECEU',
              compareceu_data: Date.now()
          });
      }

      const newTicketNumber = await dispenseTicket(selectedType!, service, observations);
      setLastTicket({ number: newTicketNumber, service, observations });
      setStep('confirmation');
      setIsValidationModalOpen(false);
      setObservations('');
    } catch (error) {
      console.error("Failed to dispense ticket:", error);
      alert(error instanceof Error ? error.message : 'Ocorreu um erro ao emitir a senha.');
    } finally {
      setIsDispensing(false);
    }
  };

  const handleSearchAppointment = () => {
    setValidationError(null);
    setFoundAppointment(null);

    const input = validationInput.trim();
    if (!input) {
        setValidationError('Por favor, informe o CPF ou o número do agendamento.');
        return;
    }

    const cleanInput = input.replace(/\D/g, '');
    const upperInput = input.toUpperCase();

    const found = state.agenda.find(entry => {
        const entryCpf = (entry.cpf || '').replace(/\D/g, '');
        const entryTicket = (entry.ticketNumber || '').toUpperCase();
        const entryStatus = (entry.status || '').toUpperCase();

        const matchCpf = cleanInput.length === 11 && entryCpf === cleanInput;
        const matchId = entry.controle_id?.toString() === cleanInput;
        const matchTicket = entryTicket === upperInput;
        
        // Allowed statuses: AGENDADO or COMPARECEU (though we might block reuse)
        const isValidStatus = entryStatus === 'AGENDADO';
        const isAlreadyUsed = entryStatus === 'COMPARECEU';
        
        if ((matchCpf || matchId || matchTicket) && isAlreadyUsed) {
            setValidationError('Este agendamento já foi utilizado para emissão de senha hoje.');
            return false;
        }

        return (matchCpf || matchId || matchTicket) && isValidStatus;
    });

    if (found) {
        setFoundAppointment(found);
    } else if (!validationError) {
        setValidationError('Nenhum agendamento ativo localizado com os dados informados. Verifique se os dados estão corretos ou se o agendamento já foi utilizado.');
    }
  };

  const handleReinsertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDispensing || !reinsertTicketNumber) return;
    setIsDispensing(true);
    setReinsertMessage(null);
    try {
      const result = await reinsertTicket(reinsertTicketNumber);
      if (result.success) {
        setReinsertMessage({ type: 'success', text: result.message });
      } else {
        let errorMessage = result.message;
        if (result.details) {
          const { deskId, user, timestamp } = result.details;
          const time = new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          errorMessage = `Essa senha já foi atendida na Mesa ${deskId} por ${user} às ${time}.`;
        }
        setReinsertMessage({ type: 'error', text: errorMessage });
      }
    } catch (error) {
      setReinsertMessage({ type: 'error', text: 'Ocorreu um erro ao reinserir a senha.' });
    } finally {
      setIsDispensing(false);
      setReinsertTicketNumber('');
    }
  };

  const resetToStart = () => {
    setStep('type');
    setSelectedType(null);
    setLastTicket(null);
    setReinsertMessage(null);
    setReinsertTicketNumber('');
    setIsValidationModalOpen(false);
    setObservations('');
    setPendingService(null);
  };

  const handlePrintThermal = () => {
    if (!lastTicket) return;

    const typeLabel = lastTicket.number.startsWith('N') ? 'Atendimento Normal' : 'Atendimento Preferencial';
    const serviceLabel = ServiceTypeDetails[lastTicket.service].title;
    const timestamp = new Date().toLocaleString('pt-BR');

    const ticketHTML = `
        <html>
        <head>
            <title>Senha ${lastTicket.number}</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    width: 72mm; /* Standard thermal printer width */
                    margin: 0;
                    padding: 5mm;
                    color: #000;
                    font-size: 10pt;
                }
                .center { text-align: center; }
                h1 { font-size: 12pt; margin: 0 0 5px 0; }
                p { margin: 2px 0; }
                .ticket-number { font-size: 36pt; font-weight: bold; margin: 10px 0; }
                hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
            </style>
        </head>
        <body>
            <div class="center">
                <h1>Juizado Especial Cível de Guarulhos</h1>
                <hr>
                <p>${typeLabel}</p>
                <p>Serviço: ${serviceLabel}</p>
                <hr>
                <div class="ticket-number">${lastTicket.number}</div>
                <p>${timestamp}</p>
                <p>Aguarde ser chamado no painel.</p>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=300,height=400');
    if (printWindow) {
      printWindow.document.write(ticketHTML);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 500);
    } else {
      alert('O bloqueador de pop-ups pode estar impedindo a impressão. Por favor, habilite pop-ups para este site.');
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'type':
        return (
          <>
            <h2 className="text-3xl font-bold text-white mb-8">Retire sua Senha</h2>
            <div className="space-y-6">
              <button onClick={() => handleTypeSelect('NORMAL')} disabled={!isServerOnline} className="w-full bg-blue-600 text-white font-bold py-6 px-4 rounded-xl text-2xl hover:bg-blue-700 transition-transform transform hover:scale-105 duration-300 shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none">Atendimento Normal</button>
              <button onClick={() => handleTypeSelect('PREFERENCIAL')} disabled={!isServerOnline} className="w-full bg-yellow-500 text-gray-900 font-bold py-6 px-4 rounded-xl text-2xl hover:bg-yellow-600 transition-transform transform hover:scale-105 duration-300 shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none">Atendimento Preferencial</button>
            </div>
            <div className="mt-8">
              <button
                onClick={() => setStep('reinsert')}
                disabled={!isServerOnline}
                className="w-full bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-xl text-lg hover:bg-gray-400 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                Reinserir Senha
              </button>
            </div>
          </>
        );
      case 'service':
        return (
          <>
            <ValidationModal 
                isOpen={isValidationModalOpen}
                onClose={() => setIsValidationModalOpen(false)}
                onSearch={handleSearchAppointment}
                onInputChange={setValidationInput}
                input={validationInput}
                error={validationError}
                foundAppointment={foundAppointment}
                onDispense={executeDispense}
                isDispensing={isDispensing}
                observations={observations}
                onObservationsChange={setObservations}
            />
            <button onClick={() => setStep('type')} className="absolute top-4 left-4 text-red-400 font-semibold flex items-center gap-1">&larr; Voltar</button>
            <h2 className="text-3xl font-bold text-white mb-8">Selecione o Serviço</h2>
            <div className="space-y-4">
              {Object.entries(ServiceTypeDetails).map(([key, { title, description }]) => {
                const serviceType = key as ServiceType;
                const colors = serviceColors[serviceType];
                return (
                  <button
                    key={key}
                    onClick={() => handleServiceSelect(serviceType)}
                    disabled={isDispensing || !isServerOnline}
                    className={`w-full text-left bg-gray-800 border-2 p-4 rounded-lg transition-colors duration-200 disabled:opacity-50 ${colors.border} ${colors.hoverBg}`}
                  >
                    <p className={`font-bold text-xl ${colors.text}`}>{title}</p>
                    <p className="text-gray-400">{description}</p>
                  </button>
                );
              })}
            </div>
          </>
        );
      case 'observations':
        return (
          <>
            <button onClick={() => setStep('service')} className="absolute top-4 left-4 text-red-400 font-semibold flex items-center gap-1">&larr; Voltar</button>
            <h2 className="text-3xl font-bold text-white mb-4">Informações Adicionais</h2>
            <p className="text-gray-400 mb-6">Deseja adicionar alguma observação para o atendente? (Opcional)</p>
            
            <div className="space-y-6">
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Digite aqui alguma informação que ajude no seu atendimento..."
                className="w-full bg-gray-800 text-white border-2 border-gray-700 p-4 rounded-xl text-lg focus:border-blue-500 outline-none transition-colors"
                rows={4}
                autoFocus
              />
              
              <button 
                onClick={() => executeDispense(pendingService!)} 
                disabled={isDispensing}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-5 rounded-xl text-2xl shadow-xl transform transition hover:scale-105 disabled:opacity-50"
              >
                {isDispensing ? 'EMITINDO...' : 'GERAR SENHA AGORA'}
              </button>
              
              <button 
                onClick={() => { setObservations(''); executeDispense(pendingService!); }}
                className="w-full text-gray-500 hover:text-gray-300 text-sm underline"
              >
                Pular observações e gerar senha
              </button>
            </div>
          </>
        );
      case 'reinsert':
        return (
          <>
            <button onClick={resetToStart} className="absolute top-4 left-4 text-red-400 font-semibold flex items-center gap-1">&larr; Voltar</button>
            <h2 className="text-3xl font-bold text-white mb-6">Reinserir Senha</h2>
            <p className="text-gray-400 mb-6">Digite o número da sua senha que não foi atendida. Ela será colocada novamente no final da fila.</p>
            <form onSubmit={handleReinsertSubmit} className="space-y-4">
              <input
                type="text"
                value={reinsertTicketNumber}
                onChange={(e) => setReinsertTicketNumber(e.target.value.toUpperCase())}
                placeholder="Ex: N023"
                className="w-full text-center text-2xl font-mono p-3 border-2 bg-gray-800 border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <button type="submit" disabled={isDispensing || !isServerOnline} className="w-full bg-red-600 text-white font-bold py-4 rounded-xl text-xl hover:bg-red-700 transition-colors duration-300 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
                {isDispensing ? 'Verificando...' : 'Confirmar'}
              </button>
            </form>
            {reinsertMessage && (
              <div className={`mt-6 p-4 rounded-lg text-center font-semibold ${reinsertMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {reinsertMessage.text}
              </div>
            )}
          </>
        );
      case 'confirmation':
        return (
          <>
            <div className="p-6 border-2 border-dashed border-gray-600 rounded-lg bg-gray-800">
              <p className="text-lg text-gray-300">Sua senha é:</p>
              <p className="text-7xl font-mono font-extrabold text-white my-2">{lastTicket?.number}</p>
              <p className="text-md text-gray-300 font-semibold mb-4">Serviço: {ServiceTypeDetails[lastTicket!.service].title}</p>
              <p className="text-gray-300">Aguarde ser chamado no painel.</p>
              <button onClick={handlePrintThermal} className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Imprimir Senha
              </button>
            </div>
            <button onClick={resetToStart} className="mt-8 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-4 rounded-xl text-xl transition-colors duration-300 shadow-lg">
              Emitir Nova Senha
            </button>
          </>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-black">
      <div className="relative w-full max-w-2xl p-8 bg-gray-900 rounded-2xl text-center">
        {renderContent()}
        <div className="mt-10 text-sm text-gray-400">
          <p>Senhas na fila Normal: {state.waitingNormal.length}</p>
          <p>Senhas na fila Preferencial: {state.waitingPreferential.length}</p>
          <ServerStatusIndicator onStatusChange={setIsServerOnline} />
        </div>
      </div>
    </div>
  );
};