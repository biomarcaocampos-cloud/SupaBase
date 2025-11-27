import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, ActivityLog } from '../types';
import { validateCPF } from '../utils/cpfValidator';
import api from '../services/apiService';

const getDisplayName = (fullName: string): string => {
    if (!fullName) return '';
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0];
    return `${names[0]} ${names[names.length - 1]}`;
};

// The context is initialized with an empty object. The useAuth hook provides type safety and proper context access.
export const AuthContext = createContext({});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load users from backend and restore session
    useEffect(() => {
        const initAuth = async () => {
            setIsLoading(true);

            // Try to restore session from sessionStorage
            const loggedInUserId = sessionStorage.getItem('loggedInUserId');
            const loggedInUserData = sessionStorage.getItem('loggedInUserData');

            if (loggedInUserId && loggedInUserData) {
                try {
                    const userData = JSON.parse(loggedInUserData);
                    // Convert backend user to frontend User type
                    const user: User = {
                        id: userData.id?.toString() || userData.username,
                        cpf: userData.cpf || '',
                        fullName: userData.full_name,
                        passwordHash: '', // We don't store password hash on frontend
                        role: userData.role === 'admin' ? 'MANAGER' : 'ATTENDANT',
                        isActive: userData.status === 'ATIVO',
                        profilePicture: userData.profile_picture,
                        createdAt: new Date(userData.created_at).getTime(),
                        history: {
                            statusChanges: [],
                            passwordResets: [],
                        },
                    };
                    setCurrentUser(user);
                } catch (error) {
                    console.error('Erro ao restaurar sessão:', error);
                    sessionStorage.removeItem('loggedInUserId');
                    sessionStorage.removeItem('loggedInUserData');
                }
            }

            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (cpf: string, password: string): Promise<void> => {
        try {
            // Use CPF as username (remove formatting)
            const username = cpf.replace(/\D/g, '');

            // Call backend login API
            const backendUser = await api.users.login(username, password);

            // Convert backend user to frontend User type
            const user: User = {
                id: backendUser.id?.toString() || username,
                cpf: backendUser.cpf || cpf,
                fullName: backendUser.full_name,
                passwordHash: '', // We don't store password hash on frontend
                role: backendUser.role === 'admin' ? 'MANAGER' : 'ATTENDANT',
                isActive: backendUser.status === 'ATIVO',
                profilePicture: backendUser.profile_picture,
                createdAt: new Date(backendUser.created_at).getTime(),
                history: {
                    statusChanges: [],
                    passwordResets: [],
                },
            };

            if (!user.isActive) {
                throw new Error('Este usuário está desativado.');
            }

            setCurrentUser(user);
            sessionStorage.setItem('loggedInUserId', user.id);
            sessionStorage.setItem('loggedInUserData', JSON.stringify(backendUser));

            // Log activity
            await logActivity('LOGIN', user);

            console.log('✅ Login bem-sucedido:', user.fullName);
        } catch (error) {
            console.error('❌ Erro no login:', error);
            throw error;
        }
    };

    const logout = async () => {
        if (currentUser) {
            await logActivity('LOGOUT', currentUser);
        }
        setCurrentUser(null);
        sessionStorage.removeItem('loggedInUserId');
        sessionStorage.removeItem('loggedInUserData');
    };

    const register = async (data: {
        fullName: string;
        cpf: string;
        password: string;
        profilePicture: string | null;
    }): Promise<void> => {
        if (!validateCPF(data.cpf)) {
            throw new Error('CPF inválido.');
        }

        try {
            const username = data.cpf.replace(/\D/g, '');

            // Call backend register API
            await api.users.register({
                username,
                password: data.password,
                fullName: data.fullName,
                email: null,
                cpf: data.cpf,
                profilePicture: data.profilePicture,
            });

            console.log('✅ Usuário registrado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao registrar:', error);
            throw error;
        }
    };

    const createUser = async (userData: Partial<User> & { password?: string }): Promise<void> => {
        if (!currentUser || currentUser.role !== 'MANAGER') {
            throw new Error("Apenas gestores podem criar usuários.");
        }

        if (!userData.cpf || !userData.password || !userData.fullName) {
            throw new Error("CPF, Nome e Senha são obrigatórios.");
        }

        if (!validateCPF(userData.cpf)) {
            throw new Error("CPF inválido.");
        }

        try {
            const username = userData.cpf.replace(/\D/g, '');

            await api.users.register({
                username,
                password: userData.password,
                fullName: userData.fullName,
                email: null,
                cpf: userData.cpf,
                profilePicture: userData.profilePicture || null,
            });

            console.log('✅ Usuário criado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao criar usuário:', error);
            throw error;
        }
    };

    const updateUser = async (updatedUserWithChanges: Partial<User> & { password?: string }): Promise<void> => {
        if (!currentUser || currentUser.role !== 'MANAGER') {
            throw new Error("Apenas gestores podem editar usuários.");
        }

        if (!updatedUserWithChanges.id) {
            throw new Error("ID de usuário ausente para atualização.");
        }

        try {
            const updateData: any = {};

            if (updatedUserWithChanges.fullName) {
                updateData.full_name = updatedUserWithChanges.fullName;
            }
            if (updatedUserWithChanges.role) {
                updateData.role = updatedUserWithChanges.role === 'MANAGER' ? 'admin' : 'user';
            }
            if (updatedUserWithChanges.cpf) {
                updateData.cpf = updatedUserWithChanges.cpf;
            }
            if (updatedUserWithChanges.profilePicture !== undefined) {
                updateData.profile_picture = updatedUserWithChanges.profilePicture;
            }

            await api.users.update(updatedUserWithChanges.id, updateData);

            // If updating current user, update session
            if (currentUser.id === updatedUserWithChanges.id) {
                const updatedUser = { ...currentUser, ...updatedUserWithChanges };
                setCurrentUser(updatedUser);
            }

            console.log('✅ Usuário atualizado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao atualizar usuário:', error);
            throw error;
        }
    };

    const toggleUserStatus = async (userId: string): Promise<void> => {
        if (!currentUser || currentUser.role !== 'MANAGER') {
            throw new Error("Apenas gestores podem alterar status.");
        }

        if (userId === currentUser.id) {
            throw new Error("Você não pode desativar a si mesmo.");
        }

        try {
            // Get current user status from backend
            const users = await api.users.getAll();
            const targetUser = users.users.find((u: any) => u.id.toString() === userId);

            if (!targetUser) {
                throw new Error("Usuário não encontrado.");
            }

            const newStatus = targetUser.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';

            await api.users.update(userId, { status: newStatus });

            console.log('✅ Status do usuário alterado');
        } catch (error) {
            console.error('❌ Erro ao alterar status:', error);
            throw error;
        }
    };

    const resetPassword = async (userId: string): Promise<void> => {
        if (!currentUser || currentUser.role !== 'MANAGER') {
            throw new Error("Apenas gestores podem resetar senhas.");
        }

        if (userId === currentUser.id) {
            throw new Error("Você não pode resetar sua própria senha.");
        }

        try {
            // Get user CPF to use as new password
            const users = await api.users.getAll();
            const targetUser = users.users.find((u: any) => u.id.toString() === userId);

            if (!targetUser) {
                throw new Error("Usuário não encontrado.");
            }

            const newPassword = targetUser.cpf.replace(/\D/g, '');

            await api.users.update(userId, { password: newPassword });

            console.log('✅ Senha resetada para o CPF do usuário');
        } catch (error) {
            console.error('❌ Erro ao resetar senha:', error);
            throw error;
        }
    };

    const logActivity = async (type: 'LOGIN' | 'LOGOUT', user: User) => {
        try {
            if (type === 'LOGIN') {
                const logId = `${user.id}-${Date.now()}`;
                await api.activityLogs.create({
                    id: logId,
                    user_id: user.id,
                    user_name: getDisplayName(user.fullName),
                    timestamp: Date.now(),
                    type: 'LOGIN',
                });
            } else if (type === 'LOGOUT') {
                // Find the last login log and update duration
                const logs = await api.activityLogs.getAll({ user_id: user.id, limit: 10 });
                const lastLogin = logs.logs.find((l: any) => l.type === 'LOGIN' && !l.duration);

                if (lastLogin) {
                    const duration = Date.now() - lastLogin.timestamp;
                    await api.activityLogs.updateDuration(lastLogin.id, duration);
                }
            }
        } catch (error) {
            console.warn('⚠️ Erro ao registrar atividade:', error);
            // Don't throw - activity logging is not critical
        }
    };

    const value = {
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        users,
        login,
        logout,
        register,
        createUser,
        updateUser,
        toggleUserStatus,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};