import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ProfilePictureInput } from './ProfilePictureInput';

interface ProfileEditModalProps {
    onClose: () => void;
}

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);

const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
);

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ onClose }) => {
    const { currentUser, updateUser } = useAuth();
    
    const [formData, setFormData] = useState({
        fullName: currentUser?.fullName || '',
        password: '',
        profilePicture: currentUser?.profilePicture || null,
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setIsLoading(true);
        try {
            await updateUser({
                ...currentUser,
                fullName: formData.fullName,
                profilePicture: formData.profilePicture,
                ...(formData.password ? { password: formData.password } : {})
            } as any); // Type assertion, auth context handles what is needed
            onClose();
        } catch(err) {
            alert(err instanceof Error ? err.message : 'Erro ao atualizar perfil');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave}>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Meu Perfil</h3>
                            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>
                        <div className="space-y-4">
                            <ProfilePictureInput 
                                initialImage={formData.profilePicture} 
                                onPictureChange={(pic) => setFormData(p => ({...p, profilePicture: pic}))} 
                            />
                            <div>
                                <label className="text-sm font-bold text-gray-400">Nome Completo</label>
                                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full mt-1 bg-gray-700 p-2 rounded-md border border-gray-600 text-white"/>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-400">CPF</label>
                                <input type="text" value={currentUser?.cpf || ''} disabled className="w-full mt-1 bg-gray-700 p-2 rounded-md border border-gray-600 text-gray-500 cursor-not-allowed"/>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-400">Nova Senha</label>
                                <div className="relative mt-1">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Deixe em branco para não alterar"
                                        className="w-full bg-gray-700 p-2 rounded-md pr-10 border border-gray-600 text-white"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
                                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-700 p-4 flex justify-end gap-4 rounded-b-xl border-t border-gray-600">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-md text-white font-semibold">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="bg-red-600 hover:bg-red-700 py-2 px-6 rounded-md font-semibold disabled:bg-gray-500">
                            {isLoading ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
