import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoPersonAddOutline, IoTrashOutline, IoChevronDown, IoShieldCheckmarkOutline } from 'react-icons/io5';
import { PlaylistMember } from '../types';

interface CollaborationSettingsProps {
    members: PlaylistMember[];
    onInvite: (userId: string, role: 'editor' | 'viewer') => void;
    onUpdateRole: (userId: string, role: 'editor' | 'viewer') => void;
    onRemove: (userId: string) => void;
    onClose: () => void;
    isOwner: boolean;
}

const CollaborationSettings: React.FC<CollaborationSettingsProps> = ({
    members,
    onInvite,
    onUpdateRole,
    onRemove,
    onClose,
    isOwner
}) => {
    const [inviteInput, setInviteInput] = useState('');
    const [selectedRole, setSelectedRole] = useState<'editor' | 'viewer'>('editor');

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (inviteInput.trim()) {
            onInvite(inviteInput.trim(), selectedRole);
            setInviteInput('');
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10"
            >
                <div className="p-6 sm:p-8">
                    <header className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-black">Collaboration</h2>
                            <p className="text-xs text-secondary font-bold uppercase tracking-widest mt-1">Manage Editors & Viewers</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-secondary/10 rounded-full transition-colors">
                            <IoClose size={24} />
                        </button>
                    </header>

                    {/* Invite Form */}
                    {isOwner && (
                        <form onSubmit={handleInvite} className="mb-8">
                            <div className="flex flex-col gap-3">
                                <div className="relative">
                                    <label htmlFor="invite-username" className="sr-only">Username</label>
                                    <input
                                        id="invite-username"
                                        type="text"
                                        placeholder="Enter username to invite..."
                                        value={inviteInput}
                                        onChange={(e) => setInviteInput(e.target.value)}
                                        className="w-full bg-secondary/5 border-2 border-transparent focus:border-primary/30 rounded-2xl p-4 pr-32 outline-none transition-all font-medium text-sm"
                                    />
                                    <div className="absolute right-2 top-2 bottom-2">
                                        <label htmlFor="invite-role" className="sr-only">Role</label>
                                        <select
                                            id="invite-role"
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value as any)}
                                            className="h-full bg-white dark:bg-gray-800 rounded-xl px-3 text-xs font-bold border border-secondary/10 outline-none"
                                        >
                                            <option value="editor">Editor</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-primary text-white font-black p-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                                >
                                    <IoPersonAddOutline size={18} />
                                    Send Invitation
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Members List */}
                    <div className="space-y-4 max-h-[40vh] overflow-y-auto no-scrollbar">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-secondary mb-2">Members ({members.length})</h3>
                        {members.map((member) => (
                            <div key={member.userId} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/5 transition-colors group">
                                <img
                                    src={member.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.profile?.username}`}
                                    className="w-10 h-10 rounded-full bg-secondary/10 object-cover"
                                    alt=""
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-bold text-sm truncate">{member.profile?.displayName || member.userId}</p>
                                        {member.role === 'owner' && <IoShieldCheckmarkOutline className="text-primary" size={14} />}
                                    </div>
                                    <p className="text-[10px] text-secondary font-medium uppercase tracking-tight">{member.role}</p>
                                </div>

                                {isOwner && member.role !== 'owner' && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onRemove(member.userId)}
                                            className="p-2 text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                        >
                                            <IoTrashOutline size={18} />
                                        </button>
                                        <button
                                            onClick={() => onUpdateRole(member.userId, member.role === 'editor' ? 'viewer' : 'editor')}
                                            className="p-2 text-secondary hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                        >
                                            <IoChevronDown size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CollaborationSettings;
