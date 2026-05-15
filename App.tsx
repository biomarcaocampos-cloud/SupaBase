import React, { useState, useEffect, useMemo } from 'react';
import { QueueProvider } from './context/QueueContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { HomeSelector } from './components/HomeSelector';
import { DisplayScreen } from './components/DisplayScreen';
import { TicketDispenser } from './context/TicketDispenser';
import { ServiceDesk } from './components/ServiceDesk';
import { Header } from './components/Header';
import { useQueue } from './hooks/useQueue';
import { CompletedService, AbandonedTicket, ServiceTypeDetails, ServiceType, User, ActivityLog, AgendaEntry, LocaisRetorno, LocalRetorno, ServiceDesk as ServiceDeskType } from './types';

import { LoginScreen } from './components/auth/LoginScreen';
import { RegisterScreen } from './components/auth/RegisterScreen';
import { UserManagement } from './components/management/UserManagement';
import { DOCUMENT_CHECKLIST } from './constants/documents';
import { validateCPF, validateEmail } from './utils/cpfValidator';
import { AgendaModal } from './components/AgendaModal';


declare global {
    interface Window {
        jspdf: any;
    }
}

const getDisplayName = (fullName: string): string => {
    if (!fullName) return '';
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0];
    return `${names[0]} ${names[names.length - 1]}`;
};

const formatTime = (ms: number): string => {
    if (!ms || isNaN(ms) || ms < 0) return '00:00';
    
    // Sanitize: if ms is too large (more than 100 hours), it's likely corrupted data
    const MAX_REASONABLE_TIME = 100 * 3600 * 1000;
    const safeMs = ms > MAX_REASONABLE_TIME ? 0 : ms;
    
    const totalSeconds = Math.floor(safeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return hours > 0 ? `${hours.toString().padStart(2, '0')}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
};


const AbandonedTicketsModal: React.FC<{ title: string; tickets: AbandonedTicket[]; onClose: () => void; }> = ({ title, tickets, onClose }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-4">
                    <table className="w-full text-left table-auto">
                        <thead className="bg-gray-700 sticky top-0">
                            <tr>
                                <th className="p-3 text-sm font-semibold uppercase">Senha</th>
                                <th className="p-3 text-sm font-semibold uppercase">Data</th>
                                <th className="p-3 text-sm font-semibold uppercase">Chamado às</th>
                                <th className="p-3 text-sm font-semibold uppercase">Mesa</th>
                                <th className="p-3 text-sm font-semibold uppercase">Atendente</th>
                                <th className="p-3 text-sm font-semibold uppercase">T. Espera</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-600">
                            {tickets.length > 0 ? [...tickets].sort((a, b) => b.abandonedTimestamp - a.abandonedTimestamp).map(ticket => (
                                <tr key={`${ticket.ticketNumber}-${ticket.abandonedTimestamp}`} className="hover:bg-gray-700">
                                    <td className="p-3 font-mono text-red-400 font-bold">{ticket.ticketNumber}</td>
                                    <td className="p-3">{new Date(ticket.abandonedTimestamp).toLocaleDateString('pt-BR')}</td>
                                    <td className="p-3">{new Date(ticket.calledTimestamp).toLocaleTimeString('pt-BR')}</td>
                                    <td className="p-3">Mesa {ticket.deskId}</td>
                                    <td className="p-3">{ticket.userName}</td>
                                    <td className="p-3 font-mono">{formatTime(ticket.waitTime)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="text-center p-8 text-gray-400">Nenhuma senha abandonada encontrada no período.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const CompletedServicesModal: React.FC<{ title: string; services: CompletedService[]; onClose: () => void; }> = ({ title, services, onClose }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-4">
                    <table className="w-full text-left table-auto">
                        <thead className="bg-gray-700 sticky top-0">
                            <tr>
                                <th className="p-3 text-sm font-semibold uppercase">Senha</th>
                                <th className="p-3 text-sm font-semibold uppercase">Data</th>
                                <th className="p-3 text-sm font-semibold uppercase">Finalizado às</th>
                                <th className="p-3 text-sm font-semibold uppercase">Mesa</th>
                                <th className="p-3 text-sm font-semibold uppercase">Atendente</th>
                                <th className="p-3 text-sm font-semibold uppercase">T. Espera</th>
                                <th className="p-3 text-sm font-semibold uppercase">T. Atendimento</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-600">
                            {services.length > 0 ? [...services].sort((a, b) => b.completedTimestamp - a.completedTimestamp).map(s => (
                                <tr key={`${s.ticketNumber}-${s.completedTimestamp}`} className="hover:bg-gray-700">
                                    <td className="p-3 font-mono text-green-400 font-bold">{s.ticketNumber}</td>
                                    <td className="p-3">{new Date(s.completedTimestamp).toLocaleDateString('pt-BR')}</td>
                                    <td className="p-3">{new Date(s.completedTimestamp).toLocaleTimeString('pt-BR')}</td>
                                    <td className="p-3">Mesa {s.deskId}</td>
                                    <td className="p-3">{s.userName}</td>
                                    <td className="p-3 font-mono">{formatTime(s.waitTime)}</td>
                                    <td className="p-3 font-mono">{formatTime(s.serviceDuration)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={7} className="text-center p-8 text-gray-400">Nenhum atendimento realizado encontrado no período.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const MessageManagementModal: React.FC<{
    onClose: () => void;
    tips: string[];
    alertMessage: string | null;
    updateTips: (newTips: string[]) => void;
    setAlertMessage: (message: string) => void;
    clearAlertMessage: () => void;
}> = ({ onClose, tips, alertMessage, updateTips, setAlertMessage, clearAlertMessage }) => {
    // ESTADO FIXO EM 10 CAMPOS - ESTÁVEL
    const [editableTips, setEditableTips] = useState<string[]>(() => {
        const base = [...tips];
        while (base.length < 10) base.push('');
        return base.slice(0, 10);
    });

    const [alertInput, setAlertInput] = useState('');

    const handleSave = () => {
        const filteredTips = editableTips.map(t => (t || '').trim()).filter(t => t !== '');
        updateTips(filteredTips);
        
        if (alertInput.trim()) {
            setAlertMessage(alertInput.trim());
        }
        alert('Mensagens salvas!');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold">Gerenciar Mensagens do Painel</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6 space-y-6">
                    <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                        <h4 className="font-semibold text-red-400 mb-2">Mensagem de Alerta</h4>
                        <p className="text-sm text-gray-400 mb-4">Esta mensagem se sobrepõe às dicas. Use para avisos importantes.</p>
                        {alertMessage && <div className="mb-4 p-3 bg-yellow-500 text-black font-semibold rounded-md">Ativo: "{alertMessage}"</div>}
                        <div className="flex gap-2">
                            <input type="text" value={alertInput} onChange={(e) => setAlertInput(e.target.value)} placeholder="Digite o alerta..." className="flex-grow p-2 rounded-md bg-gray-600 border border-gray-500 text-white" />
                            <button onClick={() => setAlertMessage(alertInput.trim())} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-md">Ativar</button>
                            <button onClick={clearAlertMessage} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Desativar</button>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-red-400">Mensagens Informativas</h4>
                            <span className="text-xs bg-red-900/50 text-red-300 px-2 py-1 rounded-full border border-red-800">10 Campos Disponíveis</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
                            {[...Array(10)].map((_, index) => (
                                <div key={index}>
                                    <label className="text-sm font-bold text-gray-500">Mensagem {index + 1}</label>
                                    <textarea 
                                        value={editableTips[index] || ''} 
                                        onChange={(e) => {
                                            const newTips = [...editableTips];
                                            newTips[index] = e.target.value;
                                            setEditableTips(newTips);
                                        }} 
                                        rows={3} 
                                        className="w-full mt-1 p-2 rounded-md bg-gray-600 border border-gray-500 text-white" 
                                        placeholder={`Digite a mensagem ${index + 1}...`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="text-center p-4 border-t border-gray-700 mt-auto">
                    <button onClick={handleSave} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg">Salvar Alterações</button>
                </div>
            </div>
        </div>
    );
};

const EditAgendaModal: React.FC<{ entry: AgendaEntry; onClose: () => void; onSave: (updatedEntry: AgendaEntry) => Promise<void>; }> = ({ entry, onClose, onSave }) => {
    const { currentUser } = useAuth();
    const [formData, setFormData] = useState(entry);
    const [selectedDocs, setSelectedDocs] = useState<string[]>(entry.documentos_selecionados);
    const [outrosDocsText, setOutrosDocsText] = useState(entry.outros_documentos_texto || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isFormValid = formData.nome && formData.telefone && formData.resumo && formData.data_retorno && formData.hora_retorno && formData.local_retorno;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (error) setError(null);
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleDocToggle = (doc: string) => {
        const isSelected = selectedDocs.includes(doc);
        const newSelectedDocs = isSelected ? selectedDocs.filter(d => d !== doc) : [...selectedDocs, doc];
        setSelectedDocs(newSelectedDocs);
        if (doc === "Outros documentos relevantes" && isSelected) setOutrosDocsText('');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!isFormValid) {
            setError('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }
        if (formData.cpf && !validateCPF(formData.cpf)) {
            setError('O CPF inserido é inválido.');
            return;
        }
        if (formData.email && !validateEmail(formData.email)) {
            setError('O e-mail inserido é inválido.');
            return;
        }

        setIsLoading(true);
        try {
            const updatedEntry = {
                ...formData,
                documentos_selecionados: selectedDocs,
                outros_documentos_texto: selectedDocs.includes("Outros documentos relevantes") ? outrosDocsText : undefined,
                usuario_registro: getDisplayName(currentUser?.fullName || 'Desconhecido'),
                data_do_registro: Date.now(),
                status: entry.status === 'CANCELADO' ? 'AGENDADO' : formData.status,
            };
            await onSave(updatedEntry);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao salvar.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSave} className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
                <h3 className="text-xl font-bold text-red-400 p-4 border-b border-gray-700">Editar Agendamento</h3>
                <div className="overflow-y-auto p-6 flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="md:col-span-2 font-semibold text-lg text-gray-300 border-b border-gray-600 pb-2 mb-2">Dados Pessoais</div>
                        <div><label className="text-sm">Nome Completo <span className="text-red-500">*</span></label><input type="text" name="nome" value={formData.nome} onChange={handleChange} required className="w-full mt-1 bg-gray-700 p-2 rounded" /></div>
                        <div><label className="text-sm">CPF</label><input type="text" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" className="w-full mt-1 bg-gray-700 p-2 rounded" /></div>
                        <div>
                            <label className="text-sm">Telefone <span className="text-red-500">*</span></label>
                            <input type="tel" name="telefone" value={formData.telefone} onChange={handleChange} required className="w-full mt-1 bg-gray-700 p-2 rounded" />
                            <label className="flex items-center mt-2 text-sm"><input type="checkbox" name="whatsapp_mesmo" checked={formData.whatsapp_mesmo} onChange={handleChange} className="mr-2 h-4 w-4 rounded bg-gray-600 text-red-500 focus:ring-red-500" /> O WhatsApp é o mesmo número?</label>
                        </div>
                        <div><label className="text-sm">E-mail</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full mt-1 bg-gray-700 p-2 rounded" /></div>

                        <div className="md:col-span-2 font-semibold text-lg text-gray-300 border-b border-gray-600 pb-2 mb-2 mt-4">Resumo da Demanda</div>
                        <div className="md:col-span-2"><label className="text-sm">Descreva o caso <span className="text-red-500">*</span></label><textarea name="resumo" value={formData.resumo} onChange={handleChange} required rows={4} className="w-full mt-1 bg-gray-700 p-2 rounded" /></div>

                        <div className="md:col-span-2 font-semibold text-lg text-gray-300 border-b border-gray-600 pb-2 mb-2 mt-4">Agendamento</div>
                        <div><label className="text-sm">Data do Retorno <span className="text-red-500">*</span></label><input type="date" name="data_retorno" value={formData.data_retorno} onChange={handleChange} required className="w-full mt-1 bg-gray-700 p-2 rounded" /></div>
                        <div><label className="text-sm">Horário do Retorno <span className="text-red-500">*</span></label><input type="time" name="hora_retorno" value={formData.hora_retorno} onChange={handleChange} required className="w-full mt-1 bg-gray-700 p-2 rounded" /></div>
                        <div className="md:col-span-2"><label className="text-sm">Local do Retorno <span className="text-red-500">*</span></label><select name="local_retorno" value={formData.local_retorno} onChange={handleChange} required className="w-full mt-1 bg-gray-700 p-2 rounded">{Object.entries(LocaisRetorno).map(([key, value]) => <option key={key} value={key}>{key} - {value}</option>)}</select></div>

                        <div className="md:col-span-2 font-semibold text-lg text-gray-300 border-b border-gray-600 pb-2 mb-2 mt-4">Documentos a Apresentar</div>
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            {DOCUMENT_CHECKLIST.map(doc => <label key={doc} className="flex items-center p-2 bg-gray-700 rounded-md hover:bg-gray-600 cursor-pointer"><input type="checkbox" checked={selectedDocs.includes(doc)} onChange={() => handleDocToggle(doc)} className="mr-3 h-4 w-4 rounded bg-gray-600 text-red-500 focus:ring-red-500" />{doc}</label>)}
                        </div>
                        {selectedDocs.includes("Outros documentos relevantes") && (
                            <div className="md:col-span-2"><label className="text-sm">Especifique outros documentos</label><textarea value={outrosDocsText} onChange={e => setOutrosDocsText(e.target.value)} rows={2} className="w-full mt-1 bg-gray-700 p-2 rounded" /></div>
                        )}

                    </div>
                </div>
                <div className="p-4 flex justify-between items-center gap-4 border-t border-gray-700 sticky bottom-0 bg-gray-800">
                    <div className="flex-grow">{error && <div className="text-red-400 text-sm font-semibold">{error}</div>}</div>
                    <div className="flex gap-4 flex-shrink-0">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-md text-white font-semibold">Cancelar</button>
                        <button 
                            type="submit" 
                            disabled={isLoading || !isFormValid} 
                            className={`${entry.status === 'CANCELADO' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} py-2 px-6 rounded-md font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors`}
                        >
                            {isLoading ? 'Processando...' : (entry.status === 'CANCELADO' ? 'Reativar Agendamento' : 'Salvar Alterações')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

const AgendaManagement: React.FC = () => {
    const { state, cancelAgendaEntry, updateAgendaEntry } = useQueue();
    const { currentUser } = useAuth();
    const { agenda } = state;
    
    const handlePrintAgenda = (data: AgendaEntry) => {
        const date = new Date(data.data_retorno + 'T00:00:00').toLocaleDateString('pt-BR');
        const docsHtml = data.documentos_selecionados.map(doc => `<li>${doc === "Outros documentos relevantes" && data.outros_documentos_texto ? `Outros: ${data.outros_documentos_texto}` : doc}</li>`).join('');
        const printContent = `
            <html><head><title>Comprovante de Agendamento</title>
            <style>body{font-family:sans-serif;margin:20px}h1{font-size:18px;border-bottom:1px solid #000;padding-bottom:5px}p{margin:5px 0}ul{padding-left:20px}strong{display:inline-block;width:120px}</style></head>
            <body>
            <h1>Comprovante de Agendamento - JEC Guarulhos</h1>
            <p><strong>Nº CONTROLE:</strong> ${data.controle_id || '---'}</p>
            <p><strong>Nome:</strong> ${data.nome}</p>
            <p><strong>Retornar em:</strong> ${date} às ${data.hora_retorno}</p>
            <p><strong>Local:</strong> ${data.local_retorno} - ${LocaisRetorno[data.local_retorno]}</p>
            <hr><p><strong>Documentos a apresentar:</strong></p><ul>${docsHtml}</ul>
            <hr><p><strong>Resumo do caso:</strong> ${data.resumo}</p>
            <hr><p style="font-size: 10px; color: #666">Atendente Responsável: ${data.usuario_registro} | Data: ${new Date(data.data_do_registro).toLocaleString('pt-BR')}</p>
            </body></html>`;

        const printWindow = window.open('', '_blank');
        printWindow?.document.write(printContent);
        printWindow?.document.close();
        // Wait a small bit for content to load before printing
        setTimeout(() => {
            printWindow?.print();
        }, 500);
    };

    const todayStr = new Date().toISOString().slice(0, 10);

    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [searchDateType, setSearchDateType] = useState<'registro' | 'retorno'>('registro');
    const [nameFilter, setNameFilter] = useState('');
    const [cpfFilter, setCpfFilter] = useState('');
    const [editingEntry, setEditingEntry] = useState<AgendaEntry | null>(null);
    const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
    const [filterMode, setFilterMode] = useState<'normal' | 'pending' | 'cancelled'>('normal');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 30;

    const displayAgenda = useMemo(() => {
        let base = [];
        if (filterMode === 'pending') {
            base = agenda.filter(a => a.status === 'AGENDADO');
        } else if (filterMode === 'cancelled') {
            base = agenda.filter(a => a.status === 'CANCELADO');
        } else {
            base = agenda.filter(entry => {
                const entryDateStr = searchDateType === 'retorno' 
                    ? entry.data_retorno 
                    : new Date(entry.data_do_registro).toISOString().split('T')[0];
                
                const isNameMatch = nameFilter.trim() === '' || entry.nome.toLowerCase().includes(nameFilter.toLowerCase());
                const cleanCpfFilter = cpfFilter.replace(/\D/g, '');
                const isCpfMatch = cleanCpfFilter === '' || (entry.cpf && entry.cpf.replace(/\D/g, '').includes(cleanCpfFilter));
                const isDateMatch = (startDate === '' && endDate === '') || (entryDateStr >= startDate && entryDateStr <= endDate);

                return isNameMatch && isCpfMatch && isDateMatch;
            });
        }
        
        return base.sort((a, b) => {
            if (filterMode === 'normal') {
                return new Date(a.data_retorno).getTime() - new Date(b.data_retorno).getTime() || a.hora_retorno.localeCompare(b.hora_retorno);
            }
            return b.data_do_registro - a.data_do_registro;
        });
    }, [agenda, filterMode, startDate, endDate, searchDateType, nameFilter, cpfFilter]);

    const totalPages = Math.ceil(displayAgenda.length / itemsPerPage);
    const paginatedAgenda = displayAgenda.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filterMode, startDate, endDate, nameFilter, cpfFilter]);

    const totalPending = agenda.filter(a => a.status === 'AGENDADO').length;
    const totalCancelled = agenda.filter(a => a.status === 'CANCELADO').length;
    const periodCount = agenda.filter(entry => {
        const entryDateStr = searchDateType === 'retorno' ? entry.data_retorno : new Date(entry.data_do_registro).toISOString().split('T')[0];
        return (startDate === '' && endDate === '') || (entryDateStr >= startDate && entryDateStr <= endDate);
    }).length;

    const handleCancelEntry = (entryId: string) => {
        if (window.confirm("Tem certeza que deseja desativar este agendamento por desistência?")) {
            cancelAgendaEntry(entryId);
        }
    };

    const getStatusBadge = (entry: AgendaEntry) => {
        const status = entry.status;
        switch (status) {
            case 'AGENDADO': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-900 text-yellow-300">AGENDADO</span>;
            case 'CONCLUÍDO': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-900 text-green-300">CONCLUÍDO</span>;
            case 'COMPARECEU': 
                const time = entry.compareceu_data ? new Date(entry.compareceu_data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '---';
                return (
                    <span 
                        className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-900 text-blue-300 cursor-help"
                        title={`Compareceu às: ${time}`}
                    >
                        COMPARECEU
                    </span>
                );
            case 'CANCELADO': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-700 text-gray-300">CANCELADO</span>;
            default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-700 text-gray-300">{status}</span>;
        }
    };

    const StatCard: React.FC<{ title: string; value: string; active: boolean; onClick: () => void; color: string; }> = ({ title, value, active, onClick, color }) => (
        <div 
            onClick={onClick}
            className={`cursor-pointer p-4 rounded-xl shadow transition-all duration-200 transform ${active ? `ring-2 ${color} bg-gray-700 scale-105` : 'bg-gray-800 hover:bg-gray-750'}`}
        >
            <p className={`text-sm uppercase font-bold mb-1 ${active ? 'text-white' : 'text-gray-400'}`}>{title}</p>
            <p className="text-white text-3xl font-black">{value}</p>
            {active && <div className="mt-2 text-xs font-bold text-blue-400">FILTRO ATIVO</div>}
        </div>
    );

    return (
        <div className="bg-gray-900 text-white p-6 rounded-xl">
            <div className="flex justify-end mb-6">
                <button onClick={() => setIsAgendaModalOpen(true)} className="bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
                    Novo Agendamento
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 bg-gray-800 p-4 rounded-lg items-end">
                <div>
                    <label className="text-sm font-semibold text-gray-400 block mb-1">Data Inicial</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600" />
                </div>
                <div>
                    <label className="text-sm font-semibold text-gray-400 block mb-1">Data Final</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md border border-gray-600" />
                </div>
                <div className="flex flex-col justify-center h-full gap-2 px-2">
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input type="radio" name="searchDateType" value="registro" checked={searchDateType === 'registro'} onChange={() => setSearchDateType('registro')} className="text-red-500 focus:ring-red-500" />
                        Por Registro
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input type="radio" name="searchDateType" value="retorno" checked={searchDateType === 'retorno'} onChange={() => setSearchDateType('retorno')} className="text-red-500 focus:ring-red-500" />
                        Por Retorno
                    </label>
                </div>
                <div><label className="text-sm font-semibold text-gray-400">Pesquisar por Nome</label><input type="text" value={nameFilter} onChange={e => setNameFilter(e.target.value)} placeholder="Busca por nome..." className="w-full mt-1 bg-gray-700 text-white p-2 rounded-md border border-gray-600" /></div>
                <div><label className="text-sm font-semibold text-gray-400">Pesquisar por CPF</label><input type="text" value={cpfFilter} onChange={e => setCpfFilter(e.target.value)} placeholder="Busca por CPF..." className="w-full mt-1 bg-gray-700 text-white p-2 rounded-md border border-gray-600" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <StatCard 
                    title="Agendamentos no Período" 
                    value={String(periodCount)} 
                    active={filterMode === 'normal'}
                    onClick={() => setFilterMode('normal')}
                    color="ring-blue-500"
                />
                <StatCard 
                    title="Total Pendentes" 
                    value={String(totalPending)} 
                    active={filterMode === 'pending'}
                    onClick={() => setFilterMode('pending')}
                    color="ring-yellow-500"
                />
                <StatCard 
                    title="Total Cancelados" 
                    value={String(totalCancelled)} 
                    active={filterMode === 'cancelled'}
                    onClick={() => setFilterMode('cancelled')}
                    color="ring-red-500"
                />
            </div>
            <div className="overflow-x-auto bg-gray-800 rounded-lg">
                <table className="w-full text-left min-w-[840px]">
                    <thead className="bg-gray-700 text-gray-300">
                        <tr>
                            <th className="p-3 text-sm font-semibold uppercase">Nº Controle</th>
                            <th className="p-3 text-sm font-semibold uppercase">Nome</th>
                            <th className="p-3 text-sm font-semibold uppercase">CPF</th>
                            <th className="p-3 text-sm font-semibold uppercase">Data Retorno</th>
                            <th className="p-3 text-sm font-semibold uppercase">Horário</th>
                            <th className="p-3 text-sm font-semibold uppercase">Local</th>
                            <th className="p-3 text-sm font-semibold uppercase">Status</th>
                            <th className="p-3 text-sm font-semibold uppercase text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {paginatedAgenda.map(entry => (
                            <tr key={entry.id} className="hover:bg-gray-750 transition-colors duration-150">
                                <td className="p-3 border-b border-gray-750">
                                    <button 
                                        onClick={() => handlePrintAgenda(entry)}
                                        className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded font-mono font-bold hover:bg-blue-800 transition-colors cursor-pointer"
                                        title={`Clique para imprimir. Registrado por: ${entry.usuario_registro || 'Desconhecido'}`}
                                    >
                                        #{entry.controle_id || '---'}
                                    </button>
                                </td>
                                <td className="p-3 font-bold text-white border-b border-gray-750">{entry.nome}</td>
                                <td className="p-3 font-mono text-gray-300 border-b border-gray-750">{entry.cpf || 'N/A'}</td>
                                <td className="p-3 text-gray-300 border-b border-gray-750">{new Date(entry.data_retorno + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                <td className="p-3 font-mono text-gray-300 border-b border-gray-750">{entry.hora_retorno}</td>
                                <td className="p-3 text-gray-300 border-b border-gray-750">{entry.local_retorno}</td>
                                <td className="p-3 border-b border-gray-750">{getStatusBadge(entry)}</td>
                                <td className="p-3 text-center border-b border-gray-750">
                                    <div className="flex justify-center items-center gap-3">
                                        <button 
                                            onClick={() => setEditingEntry(entry)} 
                                            disabled={entry.status === 'COMPARECEU'}
                                            title={entry.status === 'COMPARECEU' ? "Não é possível editar agendamento já utilizado" : "Editar Agendamento"} 
                                            className={`p-1 rounded transition-colors ${entry.status === 'COMPARECEU' ? 'text-gray-600 cursor-not-allowed' : 'text-blue-400 hover:text-blue-300 hover:bg-gray-600'}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                        </button>
                                        {entry.status === 'AGENDADO' && (
                                            <button onClick={() => handleCancelEntry(entry.id)} title="Cancelar Agendamento" className="text-red-500 hover:text-red-400 p-1 hover:bg-gray-600 rounded">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {paginatedAgenda.length === 0 && (
                    <div className="text-center text-gray-400 py-12 bg-gray-800 border-t border-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-lg">Nenhum agendamento encontrado.</p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="mt-6 flex justify-between items-center bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Exibindo <span className="font-bold text-white">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-bold text-white">{Math.min(currentPage * itemsPerPage, displayAgenda.length)}</span> de <span className="font-bold text-white">{displayAgenda.length}</span> resultados</p>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                        >
                            Anterior
                        </button>
                        <div className="flex items-center px-4 bg-gray-900 rounded font-mono">
                            {currentPage} / {totalPages}
                        </div>
                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}
            {editingEntry && <EditAgendaModal entry={editingEntry} onClose={() => setEditingEntry(null)} onSave={updateAgendaEntry} />}
            {isAgendaModalOpen && currentUser && (
                <AgendaModal
                    onClose={() => setIsAgendaModalOpen(false)}
                    attendant={{ id: currentUser.id, name: getDisplayName(currentUser.fullName) }}
                    ticketNumber={'MANUAL'}
                />
            )}
        </div>
    );
};



const formatDateForInput = (date: Date) => date.toISOString().split('T')[0];
const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

const ActiveDesksModal: React.FC<{ desks: ServiceDeskType[]; completedServices: CompletedService[]; onClose: () => void; }> = ({ desks, completedServices, onClose }) => {
    const { updateDeskServices, logout } = useQueue();
    const [editingDeskId, setEditingDeskId] = useState<number | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
        const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => {
            clearInterval(interval);
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    const activeDesks = desks.filter(d => d.user);

    const getDeskMetrics = (deskId: number) => {
        const deskServices = completedServices.filter(s => s.deskId === deskId);
        const avgTime = deskServices.length > 0 
            ? deskServices.reduce((a, b) => a + b.serviceDuration, 0) / deskServices.length 
            : 0;
        
        const sorted = [...deskServices].sort((a, b) => b.completedTimestamp - a.completedTimestamp);
        const lastService = sorted[0];

        return { avgTime, lastService };
    };

    const handleUpdateServices = async (deskId: number, services: ServiceType[], preferentialOnly?: boolean) => {
        setIsUpdating(true);
        try {
            await updateDeskServices(deskId, services, preferentialOnly);
            setEditingDeskId(null);
        } catch (error) {
            alert("Erro ao atualizar serviços da mesa.");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-gray-800 rounded-t-xl">
                    <div>
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                            Monitoramento de Mesas em Tempo Real
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">Gestão tática e acompanhamento de produtividade por mesa.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>

                <div className="overflow-y-auto p-6">
                    <div className="grid grid-cols-1 gap-4">
                        {activeDesks.length > 0 ? activeDesks.map(desk => {
                            const { avgTime, lastService } = getDeskMetrics(desk.id);
                            const isAtendendo = !!desk.serviceStartTime;
                            const currentDuration = isAtendendo ? currentTime - (desk.serviceStartTime || 0) : 0;
                            const idleTime = !isAtendendo && lastService ? currentTime - lastService.completedTimestamp : 0;

                            return (
                                <div key={desk.id} className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-500 transition-colors">
                                    <div className="p-4 flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 min-w-[200px]">
                                            <div className="bg-gray-800 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl border border-gray-700">
                                                {desk.id}
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg flex items-center gap-2" title={desk.user?.displayName}>
                                                    {desk.user?.displayName.split(' ')[0]}
                                                    {desk.preferentialOnly && (
                                                        <span className="bg-yellow-900/50 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded border border-yellow-700/50 uppercase font-black tracking-tighter animate-pulse" title="Mesa restrita a atendimento PREFERENCIAL">
                                                            ★ PREF
                                                        </span>
                                                    )}
                                                </p>
                                                <div className="flex gap-1 mt-1">
                                                    {desk.services.map(s => (
                                                        <span key={s} className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 border border-gray-700">
                                                            {ServiceTypeDetails[s].title.split(' ')[0]}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                            <div className="bg-black bg-opacity-30 p-2 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase">Status</p>
                                                <p className={`font-bold ${isAtendendo ? 'text-green-400' : 'text-yellow-500'}`}>
                                                    {isAtendendo ? `Atendendo ${desk.currentTicket}` : 'Ocioso'}
                                                </p>
                                            </div>
                                            <div className="bg-black bg-opacity-30 p-2 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase">T. Médio</p>
                                                <p className="font-mono font-bold text-blue-400">{formatTime(avgTime)}</p>
                                            </div>
                                            <div className="bg-black bg-opacity-30 p-2 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase">{isAtendendo ? 'Cronômetro' : 'Última Duração'}</p>
                                                <p className={`font-mono font-bold ${isAtendendo ? 'text-green-400' : 'text-gray-400'}`}>
                                                    {isAtendendo ? formatTime(currentDuration) : (lastService ? formatTime(lastService.serviceDuration) : '00:00')}
                                                </p>
                                            </div>
                                            <div className="bg-black bg-opacity-30 p-2 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase">Ociosidade</p>
                                                <p className={`font-mono font-bold ${idleTime > 5 * 60000 ? 'text-red-400' : 'text-gray-400'}`}>
                                                    {idleTime > 0 ? formatTime(idleTime) : '---'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => setEditingDeskId(editingDeskId === desk.id ? null : desk.id)}
                                                className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                                </svg>
                                                Gerenciar
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    if (window.confirm(`Deseja realmente desconectar o atendente da Mesa ${desk.id}? Se houver um atendimento em curso, ele será finalizado.`)) {
                                                        setIsUpdating(true);
                                                        try {
                                                            await logout(desk.id);
                                                        } catch (error) {
                                                            alert("Erro ao desconectar mesa.");
                                                        } finally {
                                                            setIsUpdating(false);
                                                        }
                                                    }
                                                }}
                                                disabled={isUpdating}
                                                className="bg-red-900/30 hover:bg-red-600 p-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all border border-red-500/30 text-red-400 hover:text-white disabled:opacity-50"
                                                title="Sair da Mesa"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                                                </svg>
                                                Sair
                                            </button>
                                        </div>
                                    </div>

                                    {editingDeskId === desk.id && (
                                        <div className="bg-gray-800 p-4 border-t border-gray-700 animate-in slide-in-from-top duration-200">
                                            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                                Alterar Tipos de Atendimento (Mesa {desk.id})
                                            </p>
                                            <div className="flex flex-wrap gap-4 items-center">
                                                {Object.entries(ServiceTypeDetails).map(([type, details]) => {
                                                    const sType = type as ServiceType;
                                                    const isSelected = desk.services.includes(sType);
                                                    return (
                                                        <label key={type} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${isSelected ? 'bg-blue-600/20 border-blue-500 text-blue-100' : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600'}`}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    const newServices = e.target.checked 
                                                                        ? [...desk.services, sType]
                                                                        : desk.services.filter(s => s !== sType);
                                                                    handleUpdateServices(desk.id, newServices, desk.preferentialOnly);
                                                                }}
                                                                disabled={isUpdating}
                                                                className="w-4 h-4 rounded border-gray-700 text-blue-600 focus:ring-blue-500 bg-gray-900"
                                                            />
                                                            <span className="text-sm font-medium">{details.title}</span>
                                                        </label>
                                                    );
                                                })}
                                                {isUpdating && <div className="ml-2 animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>}
                                            </div>
                                            
                                            <div className="mt-4 pt-4 border-t border-gray-700">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <div className="relative">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={desk.preferentialOnly}
                                                            onChange={(e) => handleUpdateServices(desk.id, desk.services, e.target.checked)}
                                                            disabled={isUpdating}
                                                            className="sr-only"
                                                        />
                                                        <div className={`block w-14 h-8 rounded-full transition-colors ${desk.preferentialOnly ? 'bg-yellow-600' : 'bg-gray-700'}`}></div>
                                                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${desk.preferentialOnly ? 'translate-x-6' : ''}`}></div>
                                                    </div>
                                                    <div>
                                                        <span className={`font-bold ${desk.preferentialOnly ? 'text-yellow-400' : 'text-gray-300'}`}>Direcionar para Preferencial Exclusivo</span>
                                                        <p className="text-xs text-gray-500">Ao ativar, esta mesa não verá nem poderá chamar senhas de tipo Normal.</p>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }) : (
                            <div className="text-center py-20 bg-gray-900 rounded-xl border border-dashed border-gray-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.284-1.255-.758-1.659M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.284-1.255.758-1.659M12 12a4 4 0 100-8 4 4 0 000 8zm0 0v1.5a2.5 2.5 0 005 0V12a5 5 0 00-5-5z" /></svg>
                                <p className="text-gray-400 text-lg">Nenhum atendente logado no momento.</p>
                                <p className="text-gray-600 text-sm mt-2">Os atendentes aparecerão aqui assim que realizarem o login em suas mesas.</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-6 border-t border-gray-700 bg-gray-800 rounded-b-xl flex justify-end">
                    <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                        Fechar Painel
                    </button>
                </div>
            </div>
        </div>
    );
};

const ManagementScreen: React.FC<{ initialTab?: 'stats' | 'agenda' | 'users' }> = ({ initialTab = 'stats' }) => {
    const { state, updateTips, setAlertMessage, clearAlertMessage, fetchHistoricalData } = useQueue();
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [historicalData, setHistoricalData] = useState<{ completedServices: CompletedService[], abandonedTickets: AbandonedTicket[] } | null>(null);
    const [showCompletedModal, setShowCompletedModal] = useState(false);
    const [showAbandonedModal, setShowAbandonedModal] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [ticketSearchQuery, setTicketSearchQuery] = useState('');
    const [ticketSearchResults, setTicketSearchResults] = useState<any[] | null>(null);
    const [searchedTicket, setSearchedTicket] = useState('');
    const [currentTab, setCurrentTab] = useState<'stats' | 'agenda' | 'users'>(initialTab);
    const [showActiveDesksModal, setShowActiveDesksModal] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string, services: CompletedService[] } | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    useEffect(() => {
        const loadHistory = async () => {
            const today = new Date();
            if (isSameDay(startDate, today) && isSameDay(endDate, today)) {
                setHistoricalData(null);
                return;
            }

            setIsLoadingHistory(true);
            const startTimestamp = new Date(startDate);
            startTimestamp.setHours(0, 0, 0, 0);
            
            const endTimestamp = new Date(endDate);
            endTimestamp.setHours(23, 59, 59, 999);

            const data = await fetchHistoricalData(startTimestamp.getTime(), endTimestamp.getTime());
            setHistoricalData(data);
            setIsLoadingHistory(false);
        };

        loadHistory();
    }, [startDate, endDate, fetchHistoricalData]);

    const displayData = (() => {
        const today = new Date();
        if (isSameDay(startDate, today) && isSameDay(endDate, today)) return { ...state, isLive: true };

        if (historicalData) {
            return { 
                ...state, 
                completedServices: historicalData.completedServices, 
                abandonedTickets: historicalData.abandonedTickets, 
                waitingNormal: [], 
                waitingPreferential: [], 
                isLive: false 
            };
        }

        return { ...state, completedServices: [], abandonedTickets: [], waitingNormal: [], waitingPreferential: [], isLive: false };
    })();

    const { completedServices: fetchedServices, waitingNormal, waitingPreferential, abandonedTickets, isLive, desks } = displayData;

    // Filter out corrupted data (durations over 4 hours are ignored for stats)
    const MAX_DURATION = 4 * 3600 * 1000; 
    const allCompletedServices = fetchedServices; // Original unfiltered list
    const completedServices = fetchedServices.filter(s => s.serviceDuration < MAX_DURATION);

    const activeDesks = useMemo(() =>
        isLive ? desks.filter(d => d.user && d.serviceStartTime) : [],
        [desks, isLive]
    );

    const { totalServed, totalAbandoned, estimatedTotalRemainingTime, statsByServiceType, statsByUser, normalBreakdown, prefBreakdown, normalTooltip, prefTooltip, statsByTicketType } = (() => {
        const totalServed = completedServices.length;
        const totalServiceDuration = completedServices.reduce((sum, s) => sum + s.serviceDuration, 0);
        const overallAvgServiceTime = totalServed > 0 ? totalServiceDuration / totalServed : 0;

        const statsByServiceType = Object.keys(ServiceTypeDetails).reduce((acc, s) => {
            const service = s as ServiceType;
            const ofType = completedServices.filter(c => c.service === service);
            const count = ofType.length;
            acc[service] = {
                count,
                avgWaitTime: count > 0 ? ofType.reduce((sum, s) => sum + s.waitTime, 0) / count : 0,
                avgServiceTime: count > 0 ? ofType.reduce((sum, s) => sum + s.serviceDuration, 0) / count : 0,
            };
            return acc;
        }, {} as Record<ServiceType, { count: number; avgWaitTime: number; avgServiceTime: number; }>);

        const statsByUser = Array.from(new Set(completedServices.map(s => s.userId))).map(userId => {
            const userServices = completedServices.filter(s => s.userId === userId);
            const userName = userServices[0]?.userName || 'Desconhecido';
            const count = userServices.length;
            const avgDuration = count > 0 ? userServices.reduce((a, c) => a + c.serviceDuration, 0) / count : 0;

            return {
                user: userName,
                userId: userId,
                count,
                avgDuration
            };
        }).sort((a, b) => b.count - a.count);

        const capacity = activeDesks.length > 0 ? activeDesks.length : (desks.filter(d => d.user).length || 1);
        const pendingCount = waitingNormal.length + waitingPreferential.length;

        const getBreakdown = (tickets: any[], short = false) => {
            const counts = tickets.reduce((acc, t) => {
                acc[t.service] = (acc[t.service] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
            const entries = Object.entries(counts);
            if (short) {
                return entries
                    .map(([service, count]) => `${count} ${ServiceTypeDetails[service as ServiceType]?.title.split(' ')[0] || service}`)
                    .join(', ');
            }
            return entries
                .map(([service, count]) => `• ${count} ${ServiceTypeDetails[service as ServiceType]?.title || service}`)
                .join('\n');
        };

        return {
            totalServed,
            totalAbandoned: abandonedTickets.length,
            estimatedTotalRemainingTime: (pendingCount * overallAvgServiceTime) / capacity,
            statsByServiceType,
            statsByUser,
            normalBreakdown: getBreakdown(waitingNormal, true),
            prefBreakdown: getBreakdown(waitingPreferential, true),
            normalTooltip: getBreakdown(waitingNormal),
            prefTooltip: getBreakdown(waitingPreferential),
            statsByTicketType: {
                'NORMAL': {
                    count: completedServices.filter(s => s.ticketNumber.startsWith('N')).length,
                    abandoned: abandonedTickets.filter(t => t.ticketNumber.startsWith('N')).length
                },
                'PREFERENCIAL': {
                    count: completedServices.filter(s => !s.ticketNumber.startsWith('N')).length,
                    abandoned: abandonedTickets.filter(t => t.ticketNumber.startsWith('N')).length
                }
            }
        };
    })();

    const handleTicketSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchedTicket(ticketSearchQuery);

        const searchResults = [
            // Senhas completadas
            ...state.completedServices.filter(s => s.ticketNumber.toUpperCase() === ticketSearchQuery.toUpperCase()).map(s => ({
                date: new Date(s.completedTimestamp),
                status: 'Atendido',
                user: s.userName,
                deskId: s.deskId,
                completedTimestamp: s.completedTimestamp,
            })),
            // Senhas abandonadas
            ...state.abandonedTickets.filter(t => t.ticketNumber.toUpperCase() === ticketSearchQuery.toUpperCase()).map(t => ({
                date: new Date(t.abandonedTimestamp),
                status: 'Abandonado',
                user: t.userName,
                deskId: t.deskId,
                abandonedTimestamp: t.abandonedTimestamp,
            })),
            // Senhas aguardando (Normais)
            ...state.waitingNormal.filter(t => t.number.toUpperCase() === ticketSearchQuery.toUpperCase()).map(t => ({
                date: new Date(t.dispenseTimestamp),
                status: 'Aguardando na Fila (Normal)',
                user: 'N/A',
                deskId: 0,
                completedTimestamp: t.dispenseTimestamp,
            })),
            // Senhas aguardando (Preferenciais)
            ...state.waitingPreferential.filter(t => t.number.toUpperCase() === ticketSearchQuery.toUpperCase()).map(t => ({
                date: new Date(t.dispenseTimestamp),
                status: 'Aguardando na Fila (Preferencial)',
                user: 'N/A',
                deskId: 0,
                completedTimestamp: t.dispenseTimestamp,
            })),
            // Senhas em atendimento nas mesas
            ...state.desks
                .filter(d => d.currentTicketInfo && d.currentTicketInfo.number.toUpperCase() === ticketSearchQuery.toUpperCase())
                .map(d => ({
                    date: new Date(d.currentTicketInfo!.dispenseTimestamp),
                    status: d.serviceStartTime ? 'Em Atendimento' : 'Chamado (Aguardando Iniciar)',
                    user: d.user?.displayName || 'N/A',
                    deskId: d.id,
                    completedTimestamp: d.currentTicketInfo!.dispenseTimestamp,
                }))
        ];

        setTicketSearchResults(searchResults);
    };

    const generatePDFReport = () => {
        // Mantemos a função para quem ainda quiser tentar o PDF, mas o foco agora é o modal
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            // ... (rest of the PDF logic remains the same)
            doc.save(`relatorio_detalhado_${formatDateForInput(startDate)}_a_${formatDateForInput(endDate)}.pdf`);
        } catch (e) {
            console.error("Erro ao gerar PDF:", e);
            alert("Erro ao gerar PDF. Por favor, use a opção 'Exibir Relatório' para imprimir.");
        }
    };

    const ReportModal = () => {
        if (!isReportModalOpen) return null;

        const handlePrint = () => {
            const serviceRows = Object.entries(statsByServiceType).map(([key, value]) => `
                <tr>
                    <td style="padding: 5px; border: 1px solid #ddd;">${ServiceTypeDetails[key as ServiceType]?.title || key}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${value.count}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatTime(value.avgWaitTime)}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatTime(value.avgServiceTime)}</td>
                </tr>`).join('');

            const userRows = statsByUser.map(u => `
                <tr>
                    <td style="padding: 5px; border: 1px solid #ddd;">${u.user}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${u.count}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${formatTime(u.avgDuration)}</td>
                </tr>`).join('');

            const printContent = `
                <html>
                <head>
                    <title>Relatório de Atendimento</title>
                    <style>
                        body { font-family: sans-serif; margin: 30px; color: #333; line-height: 1.4; }
                        h1 { font-size: 20px; border-bottom: 2px solid #b40000; padding-bottom: 10px; color: #b40000; text-transform: uppercase; }
                        h2 { font-size: 16px; margin-top: 25px; background: #f4f4f4; padding: 5px 10px; border-left: 4px solid #b40000; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                        th { background: #f9f9f9; text-align: left; padding: 8px; border: 1px solid #ddd; text-transform: uppercase; color: #666; font-size: 10px; }
                        .summary-box { display: flex; gap: 20px; margin: 20px 0; }
                        .stat { border: 1px solid #ddd; padding: 15px; flex: 1; border-radius: 5px; }
                        .stat-val { font-size: 24px; font-weight: 900; color: #b40000; }
                        .footer { margin-top: 30px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; font-style: italic; }
                    </style>
                </head>
                <body>
                    <h1>Relatório Operacional - JEC Guarulhos</h1>
                    <p><strong>Período:</strong> ${startDate.toLocaleDateString('pt-BR')} até ${endDate.toLocaleDateString('pt-BR')}</p>
                    
                    <div class="summary-box">
                        <div class="stat">
                            <strong>ATENDIDOS</strong>
                            <div class="stat-val">${totalServed}</div>
                        </div>
                        <div class="stat">
                            <strong>ABANDONOS</strong>
                            <div class="stat-val">${totalAbandoned}</div>
                        </div>
                    </div>

                    <div class="summary-box" style="margin-top: 0;">
                        <div class="stat" style="background: #f0f7ff;">
                            <strong>SENHAS NORMAIS</strong>
                            <div class="stat-val" style="color: #0056b3;">${statsByTicketType.NORMAL.count}</div>
                        </div>
                        <div class="stat" style="background: #fffdf0;">
                            <strong>SENHAS PREFERENCIAIS</strong>
                            <div class="stat-val" style="color: #856404;">${statsByTicketType.PREFERENCIAL.count}</div>
                        </div>
                    </div>

                    <h2>Produtividade por Atendente</h2>
                    <table>
                        <thead><tr><th>Atendente</th><th style="text-align:center">Total</th><th style="text-align:right">Tempo Médio</th></tr></thead>
                        <tbody>${userRows}</tbody>
                    </table>

                    <h2>Desempenho por Serviço</h2>
                    <table>
                        <thead><tr><th>Serviço</th><th style="text-align:center">Qtd</th><th style="text-align:right">Espera Média</th><th style="text-align:right">Atend. Médio</th></tr></thead>
                        <tbody>${serviceRows}</tbody>
                    </table>

                    <div class="footer">Gerado em: ${new Date().toLocaleString('pt-BR')} | Sistema de Gestão de Atendimento</div>
                </body>
                </html>`;

            const printWindow = window.open('', '_blank');
            printWindow?.document.write(printContent);
            printWindow?.document.close();
            setTimeout(() => printWindow?.print(), 500);
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center z-50 p-4 overflow-y-auto" onClick={() => setIsReportModalOpen(false)}>
                <div className="bg-white text-gray-900 rounded-xl shadow-2xl w-full max-w-5xl p-8 my-8 print:hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-8 border-b-2 border-red-700 pb-4">
                        <div>
                            <h2 className="text-3xl font-black text-red-700 uppercase">Pré-visualização do Relatório</h2>
                            <p className="text-gray-500 font-bold">Confira as informações táticas do período.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handlePrint} className="bg-red-700 hover:bg-red-800 text-white px-6 py-3 rounded-lg font-black flex items-center gap-2 shadow-xl transition-all transform hover:scale-105">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                                IMPRIMIR RELATÓRIO
                            </button>
                            <button onClick={() => setIsReportModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-bold">
                                FECHAR
                            </button>
                        </div>
                    </div>

                    <div className="space-y-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <div>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Período Selecionado</p>
                                <p className="text-2xl font-bold text-gray-800">{startDate.toLocaleDateString('pt-BR')} — {endDate.toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div className="flex gap-8">
                                <div className="text-right">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Atendidos</p>
                                    <p className="text-4xl font-black text-green-600">{totalServed}</p>
                                </div>
                                <div className="text-right border-l pl-8">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Abandonos</p>
                                    <p className="text-4xl font-black text-red-600">{totalAbandoned}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                                <h3 className="text-sm font-black text-gray-400 uppercase mb-4 border-b pb-2 flex justify-between">
                                    <span>Tipos de Atendimento</span>
                                    <span>Volume</span>
                                </h3>
                                <div className="space-y-3">
                                    {Object.entries(statsByServiceType).map(([key, value], i) => (
                                        <div key={i} className="flex justify-between items-center group">
                                            <span className="font-bold text-gray-700 text-sm">{ServiceTypeDetails[key as ServiceType]?.title || key}</span>
                                            <div className="flex items-center gap-3">
                                                <div className="h-1.5 bg-gray-100 w-24 rounded-full overflow-hidden">
                                                    <div className="h-full bg-red-600 rounded-full" style={{ width: `${(value.count / totalServed) * 100}%` }}></div>
                                                </div>
                                                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded font-black text-xs min-w-[30px] text-center">{value.count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                                <h3 className="text-sm font-black text-gray-400 uppercase mb-4 border-b pb-2 flex justify-between">
                                    <span>Top Produtividade</span>
                                    <span>Média</span>
                                </h3>
                                <div className="space-y-3">
                                    {statsByUser.slice(0, 5).map((u, i) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-red-700 bg-red-50 w-5 h-5 flex items-center justify-center rounded-full border border-red-100">{i + 1}</span>
                                                <span className="font-bold text-gray-700 text-sm">{u.user}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-gray-800 text-xs">{u.count} atend.</p>
                                                <p className="text-[10px] font-mono text-gray-400">{formatTime(u.avgDuration)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <h3 className="text-sm font-black text-gray-400 uppercase mb-4 border-b pb-2">Distribuição por Categoria de Senha</h3>
                            <div className="grid grid-cols-2 gap-12">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                        <span className="font-bold text-gray-600">NORMAL</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-black text-gray-800">{statsByTicketType.NORMAL.count}</span>
                                        <span className="text-xs text-gray-400 ml-1">atendidos</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border-l pl-12">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                        <span className="font-bold text-gray-600">PREFERENCIAL</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-black text-gray-800">{statsByTicketType.PREFERENCIAL.count}</span>
                                        <span className="text-xs text-gray-400 ml-1">atendidos</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const StatCard: React.FC<{ cardTitle: string; value: string; subValue?: string; icon: React.ReactNode; onClick?: () => void; disabled?: boolean; tooltip?: string; }> = ({ cardTitle, value, subValue, icon, onClick, disabled, tooltip }) => (
        <div 
            onClick={!disabled ? onClick : undefined} 
            title={tooltip} 
            className={`bg-gray-900 p-6 rounded-xl flex items-center gap-4 ${onClick && !disabled ? "cursor-pointer hover:bg-gray-800" : ""} ${disabled ? "opacity-60" : ""} ${tooltip ? "cursor-help" : ""}`}
        >
            <div className="bg-gray-800 p-3 rounded-full">{icon}</div>
            <div className="flex-grow">
                <p className="text-gray-400 text-sm uppercase">{cardTitle}</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-white text-3xl font-bold">{value}</p>
                    {subValue && <p className="text-gray-500 text-xs font-medium truncate max-w-[150px]" title={tooltip || subValue}>({subValue})</p>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full bg-black text-white p-4 lg:p-8 overflow-y-auto">
            <div className="w-full">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-3xl font-bold">
                        {currentTab === 'stats' && 'Estatísticas'}
                        {currentTab === 'agenda' && 'Agenda'}
                        {currentTab === 'users' && 'Gerenciamento de Usuários'}
                    </h2>
                    {currentTab === 'stats' && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsReportModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 shadow-lg transition-all transform hover:scale-105">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                Exibir Relatório Detalhado
                            </button>
                            <button onClick={() => setIsMessageModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg">
                                Gerenciar Mensagens
                            </button>
                        </div>
                    )}
                </div>

                {currentTab === 'stats' && (
                    <div>
                        <div className="bg-gray-900 p-4 rounded-lg mb-6 flex flex-wrap items-center gap-4">
                            <label className="font-semibold">Período:</label>
                            <input type="date" value={formatDateForInput(startDate)} onChange={e => setStartDate(new Date(e.target.value + 'T00:00:00'))} className="bg-gray-800 p-2 rounded-md border border-gray-700" />
                            <span>até</span>
                            <input type="date" value={formatDateForInput(endDate)} onChange={e => setEndDate(new Date(e.target.value + 'T00:00:00'))} className="bg-gray-800 p-2 rounded-md border border-gray-700" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            <StatCard cardTitle="Não Compareceu" value={isLoadingHistory ? "..." : String(totalAbandoned)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>} onClick={() => setShowAbandonedModal(true)} disabled={totalAbandoned === 0} />
                            <StatCard cardTitle="Realizados" value={isLoadingHistory ? "..." : String(totalServed)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>} onClick={() => setShowCompletedModal(true)} disabled={totalServed === 0} />
                            {isLive ? (
                                <>
                                    <StatCard 
                                        cardTitle="Preferenciais Aguardando" 
                                        value={String(waitingPreferential.length)} 
                                        subValue={prefBreakdown}
                                        tooltip={prefTooltip}
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>} 
                                    />
                                    <StatCard 
                                        cardTitle="Normais Aguardando" 
                                        value={String(waitingNormal.length)} 
                                        subValue={normalBreakdown}
                                        tooltip={normalTooltip}
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} 
                                    />
                                    <StatCard 
                                        cardTitle="Mesas em Atendimento" 
                                        value={String(desks.filter(d => d.user).length)} 
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.284-1.255-.758-1.659M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.284-1.255.758-1.659M12 12a4 4 0 100-8 4 4 0 000 8zm0 0v1.5a2.5 2.5 0 005 0V12a5 5 0 00-5-5z" /></svg>} 
                                        onClick={() => setShowActiveDesksModal(true)} 
                                        disabled={desks.filter(d => d.user).length === 0} 
                                        tooltip="Clique para monitorar produtividade, ociosidade e gerenciar serviços das mesas remotamente."
                                    />
                                    <StatCard 
                                        cardTitle="⌛ Atendimentos Restantes" 
                                        value={estimatedTotalRemainingTime > 0 ? formatTime(estimatedTotalRemainingTime) : "00:00"} 
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
                                        tooltip="Tempo estimado para atender todas as senhas pendentes com base na média atual e mesas ativas."
                                    />
                                </>
                            ) : (
                                <StatCard cardTitle="⌛ Atendimentos Restantes" value="N/A" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} disabled={true} />
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-gray-900 p-6 rounded-xl">
                                <h3 className="font-bold text-lg mb-4">Atendimentos por Serviço</h3>
                                <div className="space-y-4">
                                    {Object.entries(statsByServiceType).map(([key, value]) => (
                                        <div key={key}>
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="font-semibold">{ServiceTypeDetails[key as ServiceType].title}</span>
                                                <span className="text-xl font-bold">{value.count}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 flex justify-between">
                                                <span>T.M. Espera: {formatTime(value.avgWaitTime)}</span>
                                                <span>T.M. Atendimento: {formatTime(value.avgServiceTime)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-900 p-6 rounded-xl">
                                <h3 className="font-bold text-lg mb-4">Atendimentos por Atendente</h3>
                                <div className="overflow-y-auto max-h-60 pr-2">
                                    {statsByUser.map(user => (
                                        <div key={user.userId || user.user} onClick={() => setModalContent({ title: `Serviços de ${user.user}`, services: allCompletedServices.filter(s => s.userName === user.user) })} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-800 cursor-pointer border-b border-gray-800 last:border-0">
                                            <div className="flex flex-col">
                                                <span className="text-white font-medium">{user.user}</span>
                                                <span className="text-xs text-gray-500">Média: {formatTime(user.avgDuration)}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-xl text-red-500">{user.count}</span>
                                                <p className="text-[10px] text-gray-500 uppercase">Atendimentos</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-900 p-6 rounded-xl mt-8">
                            <h3 className="font-bold text-lg mb-4">Buscar Histórico da Senha</h3>
                            <form onSubmit={handleTicketSearch} className="flex gap-2">
                                <input type="text" value={ticketSearchQuery} onChange={e => setTicketSearchQuery(e.target.value.toUpperCase())} placeholder="Digite a senha (Ex: N001)" className="flex-grow bg-gray-800 p-2 rounded-md border border-gray-700" />
                                <button type="submit" className="bg-red-600 font-semibold px-4 py-2 rounded-md">Buscar</button>
                            </form>
                            {ticketSearchResults && (
                                <div className="mt-4">
                                    <h4 className="font-semibold">Resultados para "{searchedTicket}":</h4>
                                    {ticketSearchResults.length > 0 ? (
                                        <ul className="list-disc pl-5 mt-2">
                                            {ticketSearchResults.map((r, i) => (
                                                <li key={i}>{r.date.toLocaleDateString('pt-BR')} - {r.status} por {r.user} na Mesa {r.deskId} às {new Date(r.completedTimestamp || r.abandonedTimestamp).toLocaleTimeString('pt-BR')}</li>
                                            ))}
                                        </ul>
                                    ) : <p className="text-gray-400 mt-2">Nenhum registro encontrado.</p>}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {currentTab === 'agenda' && <AgendaManagement />}

                {currentTab === 'users' && <UserManagement />}
            </div>
            {modalContent && <CompletedServicesModal title={modalContent.title} services={modalContent.services} onClose={() => setModalContent(null)} />}
            {showAbandonedModal && <AbandonedTicketsModal title={`Senhas Abandonadas (${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')})`} tickets={abandonedTickets} onClose={() => setShowAbandonedModal(false)} />}
            {showCompletedModal && <CompletedServicesModal title={`Atendimentos Realizados (${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')})`} services={allCompletedServices} onClose={() => setShowCompletedModal(false)} />}
            {isMessageModalOpen && <MessageManagementModal onClose={() => setIsMessageModalOpen(false)} tips={state.tips} alertMessage={state.alertMessage} updateTips={updateTips} setAlertMessage={setAlertMessage} clearAlertMessage={clearAlertMessage} />}
            {showActiveDesksModal && <ActiveDesksModal desks={desks} completedServices={allCompletedServices} onClose={() => setShowActiveDesksModal(false)} />}
            <ReportModal />
        </div>
    );
};

type View = 'home' | 'display' | 'dispenser' | 'desk' | 'management' | 'management_agenda' | 'management_users';

const AuthFlow: React.FC = () => {
    const [view, setView] = useState<'login' | 'register'>('login');
    const [registerSuccessMessage, setRegisterSuccessMessage] = useState<string | null>(null);

    const handleSwitchToLogin = (success?: boolean) => {
        if (success) {
            setRegisterSuccessMessage('Cadastro realizado com sucesso! Você já pode fazer o login.');
        } else {
            setRegisterSuccessMessage(null);
        }
        setView('login');
    };

    const handleSwitchToRegister = () => {
        setRegisterSuccessMessage(null);
        setView('register');
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            {view === 'login' ? <LoginScreen onSwitchToRegister={handleSwitchToRegister} successMessage={registerSuccessMessage || undefined} /> : <RegisterScreen onSwitchToLogin={handleSwitchToLogin} />}
        </div>
    );
};

const MainApp: React.FC = () => {
    const [view, setView] = useState<View>('home');
    const { currentUser, logout } = useAuth();
    const { state: queueState } = useQueue();

    const renderView = () => {
        switch (view) {
            case 'display': return <DisplayScreen setView={setView} />;
            case 'dispenser': return <TicketDispenser />;
            case 'desk': return <ServiceDesk />;
            case 'management':
                if (currentUser?.role === 'MANAGER') return <ManagementScreen initialTab="stats" />;
                return <HomeSelector setView={setView} />; // Fallback for non-managers
            case 'management_agenda':
                if (currentUser?.role === 'MANAGER') return <ManagementScreen initialTab="agenda" />;
                return <HomeSelector setView={setView} />;
            case 'management_users':
                if (currentUser?.role === 'MANAGER') return <ManagementScreen initialTab="users" />;
                return <HomeSelector setView={setView} />;
            case 'home':
            default: return <HomeSelector setView={setView} />;
        }
    };

    const getHeaderInfo = () => {
        const loggedInDesk = currentUser ? queueState.desks.find(d => d.user?.id === currentUser.id) : null;

        switch (view) {
            case 'display': return null;
            case 'dispenser': return { title: 'Emissão de Senhas', subtitle: 'Retire sua senha para atendimento' };
            case 'desk':
                if (loggedInDesk) {
                    return { title: 'Mesa de Atendimento', subtitle: `Atendendo na Mesa ${loggedInDesk.id}` };
                }
                return { title: 'Mesa de Atendimento', subtitle: 'Faça o login para iniciar o atendimento' };
            case 'management': return { title: 'Gerenciamento', subtitle: 'Painel de estatísticas' };
            case 'management_agenda': return { title: 'Agenda', subtitle: 'Gerenciamento de agendamentos' };
            case 'management_users': return { title: 'Gerenciamento de Usuários', subtitle: 'Controle de acesso e permissões' };
            default: return null;
        }
    };

    const headerInfo = getHeaderInfo();
    const showHomeButton = view !== 'home' && view !== 'display';

    return (
        <div className="min-h-screen flex flex-col bg-black">
            {headerInfo && <Header
                title={headerInfo.title}
                subtitle={headerInfo.subtitle}
                user={currentUser ? { displayName: getDisplayName(currentUser.fullName), profilePicture: currentUser.profilePicture } : null}
                onLogout={logout}
                onHomeClick={showHomeButton ? () => setView('home') : undefined}
            />}
            <main className="flex-grow">
                {renderView()}
            </main>
        </div>
    );
}

const AppContent: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div className="min-h-screen bg-black flex items-center justify-center text-white">Carregando...</div>
    }

    return isAuthenticated ? <MainApp /> : <AuthFlow />;
}

const App: React.FC = () => {
    return (
        <AuthProvider>
            <QueueProvider>
                <AppContent />
            </QueueProvider>
        </AuthProvider>
    );
};

export default App;