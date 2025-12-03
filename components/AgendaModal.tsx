import React, { useState } from 'react';
import { useQueue } from '../hooks/useQueue';
import { AgendaEntry, LocalRetorno, LocaisRetorno } from '../types';
import { DOCUMENT_CHECKLIST } from '../constants/documents';
import { validateCPF, validateEmail } from '../utils/cpfValidator';

interface AgendaModalProps {
    onClose: () => void;
    attendant: { id: string; name: string; };
    ticketNumber: string;
}

export const AgendaModal: React.FC<AgendaModalProps> = ({ onClose, attendant, ticketNumber }) => {
    const { addAgendaEntry } = useQueue();
    const [formData, setFormData] = useState({
        nome: '',
        cpf: '',
        telefone: '',
        whatsapp_mesmo: true,
        email: '',
        resumo: '',
        data_retorno: '',
        hora_retorno: '',
        local_retorno: 'JEC Central' as LocalRetorno,
    });
    const [selectedDocs, setSelectedDocs] = useState<string[]>([DOCUMENT_CHECKLIST[0], DOCUMENT_CHECKLIST[1]]);
    const [outrosDocsText, setOutrosDocsText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<Omit<AgendaEntry, 'id' | 'data_do_registro' | 'status'> | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isFormValid = formData.nome && formData.telefone && formData.resumo && formData.data_retorno && formData.hora_retorno && formData.local_retorno;

    const formatCPF = (value: string) => {
        return value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').substring(0, 14);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (error) setError(null);
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else if (name === 'cpf') {
            setFormData(prev => ({ ...prev, cpf: formatCPF(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleDocToggle = (doc: string) => {
        const isSelected = selectedDocs.includes(doc);
        const newSelectedDocs = isSelected ? selectedDocs.filter(d => d !== doc) : [...selectedDocs, doc];
        setSelectedDocs(newSelectedDocs);

        if (doc === "Outros documentos relevantes" && isSelected) {
            setOutrosDocsText('');
        }
    };

    const handlePreparePreview = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!isFormValid) {
            setError('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }

        if (formData.cpf && !validateCPF(formData.cpf)) {
            setError('O CPF inserido é inválido. Verifique o número ou deixe o campo em branco.');
            return;
        }

        if (formData.email && !validateEmail(formData.email)) {
            setError('O e-mail inserido é inválido. Verifique o endereço ou deixe o campo em branco.');
            return;
        }

        const entryData: Omit<AgendaEntry, 'id' | 'data_do_registro' | 'status'> = {
            ...formData,
            documentos_selecionados: selectedDocs,
            outros_documentos_texto: selectedDocs.includes("Outros documentos relevantes") ? outrosDocsText : undefined,
            ticketNumber: ticketNumber,
            atendente_id: attendant.id,
            atendente_responsavel: attendant.name,
        };
        setPreviewData(entryData);
        setShowPreview(true);
    };

    const handlePrint = (data: Omit<AgendaEntry, 'id' | 'data_do_registro' | 'status'>) => {
        const date = new Date(data.data_retorno + 'T00:00:00').toLocaleDateString('pt-BR');
        const docsHtml = data.documentos_selecionados.map(doc => `<li>${doc === "Outros documentos relevantes" && data.outros_documentos_texto ? `Outros: ${data.outros_documentos_texto}` : doc}</li>`).join('');
        const printContent = `
            <html><head><title>Comprovante de Agendamento</title>
            <style>body{font-family:sans-serif;margin:20px}h1{font-size:18px;border-bottom:1px solid #000;padding-bottom:5px}p{margin:5px 0}ul{padding-left:20px}strong{display:inline-block;width:90px}</style></head>
            <body><h1>Comprovante de Agendamento - JEC Guarulhos</h1>
            <p><strong>Nome:</strong> ${data.nome}</p>
            <p><strong>Retornar em:</strong> ${date} às ${data.hora_retorno}</p>
            <p><strong>Local:</strong> ${data.local_retorno} - ${LocaisRetorno[data.local_retorno]}</p>
            <hr><p><strong>Documentos a apresentar:</strong></p><ul>${docsHtml}</ul>
            <hr><p><strong>Resumo do caso:</strong> ${data.resumo}</p></body></html>`;

        const printWindow = window.open('', '_blank');
        printWindow?.document.write(printContent);
        printWindow?.document.close();
        printWindow?.print();
    };

    const handleSaveAndPrint = async () => {
        if (!previewData) return;
        setIsLoading(true);
        try {
            await addAgendaEntry(previewData);
            handlePrint(previewData);
            onClose();
        } catch (error) {
            alert('Falha ao salvar o agendamento.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (showPreview && previewData) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
                <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
                    <h3 className="text-xl font-bold text-red-400 p-4 border-b border-gray-700">Revisar Agendamento</h3>
                    <div className="overflow-y-auto p-6 space-y-3 text-sm">
                        <p><strong>Nome:</strong> {previewData.nome}</p>
                        <p><strong>CPF:</strong> {previewData.cpf || 'Não informado'}</p>
                        <p><strong>Telefone:</strong> {previewData.telefone} {previewData.whatsapp_mesmo && "(WhatsApp)"}</p>
                        <p><strong>E-mail:</strong> {previewData.email || 'Não informado'}</p>
                        <p><strong>Data/Hora:</strong> {new Date(previewData.data_retorno + 'T00:00:00').toLocaleDateString('pt-BR')} às {previewData.hora_retorno}</p>
                        <p><strong>Local:</strong> {previewData.local_retorno}</p>
                        <div><strong>Documentos:</strong>
                            <ul className="list-disc pl-5 mt-1">
                                {previewData.documentos_selecionados.map(d => <li key={d}>{d}{d === "Outros documentos relevantes" && previewData.outros_documentos_texto ? `: ${previewData.outros_documentos_texto}` : ''}</li>)}
                            </ul>
                        </div>
                        <p><strong>Resumo:</strong> {previewData.resumo}</p>
                    </div>
                    <div className="p-4 flex justify-end gap-4 border-t border-gray-700 mt-auto">
                        <button onClick={() => setShowPreview(false)} className="py-2 px-4 rounded-md text-white font-semibold">Corrigir</button>
                        <button onClick={handleSaveAndPrint} disabled={isLoading} className="bg-red-600 hover:bg-red-700 py-2 px-6 rounded-md font-semibold disabled:bg-gray-500">{isLoading ? 'Salvando...' : 'Salvar e Imprimir'}</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="agenda-modal-title">
            <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-gray-800">
                    <h3 id="agenda-modal-title" className="text-xl font-bold text-red-400">Agendamento de Retorno (Atermação)</h3>
                </div>
                <form onSubmit={handlePreparePreview} className="overflow-y-auto p-6 flex-grow">
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
                </form>
                <div className="p-4 flex justify-between items-center gap-4 border-t border-gray-700 sticky bottom-0 bg-gray-800">
                    <div className="flex-grow">
                        {error && <div className="text-red-400 text-sm font-semibold">{error}</div>}
                    </div>
                    <div className="flex gap-4 flex-shrink-0">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-md text-white font-semibold">Cancelar</button>
                        <button type="submit" onClick={handlePreparePreview} disabled={!isFormValid} className="bg-red-600 hover:bg-red-700 py-2 px-6 rounded-md font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed">
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
