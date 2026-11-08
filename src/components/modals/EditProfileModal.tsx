import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    IoClose,
    IoCameraOutline,
    IoShieldCheckmarkOutline,
    IoEyeOffOutline,
    IoEyeOutline,
    IoMusicalNotesOutline,
    IoSearchOutline,
    IoAlertCircleOutline,
} from 'react-icons/io5';
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types/social';
import { useBackHandler } from '../../hooks/useBackHandler';
import { backNavigationService } from '../../services/backNavigationService';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentProfile: UserProfile | null;
    currentUserId: string;
    onSave: (updatedProfile: Partial<UserProfile>) => Promise<boolean>;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
    isOpen,
    onClose,
    currentProfile,
    currentUserId,
    onSave,
}) => {
    // Form fields
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [shareActivity, setShareActivity] = useState(true);
    const [showOnline, setShowOnline] = useState(true);
    const [allowDiscovery, setAllowDiscovery] = useState(true);

    // Initial snapshot to detect unsaved changes
    const [initialState, setInitialState] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    // Populate form on open
    useEffect(() => {
        if (isOpen && currentProfile) {
            const initial = {
                displayName: currentProfile.display_name || '',
                username: currentProfile.username || '',
                bio: currentProfile.bio || '',
                avatarUrl: currentProfile.avatar_url || '',
                isPrivate: currentProfile.is_private ?? false,
                shareActivity: currentProfile.share_activity ?? true,
                showOnline: currentProfile.show_online ?? true,
                allowDiscovery: currentProfile.allow_discovery ?? true,
            };
            setDisplayName(initial.displayName);
            setUsername(initial.username);
            setBio(initial.bio);
            setAvatarUrl(initial.avatarUrl);
            setIsPrivate(initial.isPrivate);
            setShareActivity(initial.shareActivity);
            setShowOnline(initial.showOnline);
            setAllowDiscovery(initial.allowDiscovery);
            setInitialState(initial);
            setUsernameError(null);
            setShowDiscardConfirm(false);
        }
    }, [isOpen, currentProfile]);

    // Check for unsaved changes
    const hasUnsavedChanges = (): boolean => {
        if (!initialState) return false;
        return (
            displayName.trim() !== initialState.displayName.trim() ||
            username.trim().toLowerCase() !== initialState.username.trim().toLowerCase() ||
            bio.trim() !== initialState.bio.trim() ||
            avatarUrl.trim() !== initialState.avatarUrl.trim() ||
            isPrivate !== initialState.isPrivate ||
            shareActivity !== initialState.shareActivity ||
            showOnline !== initialState.showOnline ||
            allowDiscovery !== initialState.allowDiscovery
        );
    };

    // Centralized back handler for discard confirmation & modal dismissal
    useBackHandler(isOpen, {
        id: 'edit-profile-modal-overlay',
        priority: showDiscardConfirm
            ? backNavigationService.PRIORITY.CONFIRMATION_DIALOG
            : backNavigationService.PRIORITY.MODAL_DIALOG + 15,
        onBack: () => {
            if (showDiscardConfirm) {
                setShowDiscardConfirm(false);
                return;
            }
            if (hasUnsavedChanges()) {
                setShowDiscardConfirm(true);
                return;
            }
            onClose();
        },
    });

    const handleAttemptClose = () => {
        if (hasUnsavedChanges()) {
            setShowDiscardConfirm(true);
        } else {
            onClose();
        }
    };

    // Username validation logic
    const validateUsernameFormat = (val: string): string | null => {
        const clean = val.trim();
        if (clean.length < 3) return 'Username must be at least 3 characters.';
        if (clean.length > 30) return 'Username must not exceed 30 characters.';
        if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
            return 'Username can only contain letters, numbers, and underscores.';
        }
        return null;
    };

    // Debounced username availability check
    const checkTimerRef = useRef<NodeJS.Timeout | null>(null);
    const handleUsernameChange = (val: string) => {
        const lower = val.trim().toLowerCase();
        setUsername(lower);

        const formatErr = validateUsernameFormat(lower);
        if (formatErr) {
            setUsernameError(formatErr);
            return;
        }

        // If same as existing username, no error
        if (lower === currentProfile?.username?.toLowerCase()) {
            setUsernameError(null);
            return;
        }

        setUsernameError(null);
        if (checkTimerRef.current) clearTimeout(checkTimerRef.current);

        checkTimerRef.current = setTimeout(async () => {
            setIsCheckingUsername(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id')
                    .ilike('username', lower)
                    .neq('id', currentUserId)
                    .limit(1);

                if (!error && data && data.length > 0) {
                    setUsernameError('Username is already taken.');
                } else {
                    setUsernameError(null);
                }
            } catch {
                // Ignore network check failure; will validate on submit
            } finally {
                setIsCheckingUsername(false);
            }
        }, 400);
    };

    // Avatar upload handler with validation
    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file (PNG, JPG, WebP).');
            return;
        }

        if (file.size > 3 * 1024 * 1024) {
            alert('Image must be under 3MB.');
            return;
        }

        setUploadProgress('Uploading image...');
        try {
            const ext = file.name.split('.').pop() || 'png';
            const filePath = `${currentUserId}-${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                throw new Error(uploadError.message || 'Storage upload denied.');
            }

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            if (data?.publicUrl) {
                setAvatarUrl(data.publicUrl);
                setUploadProgress(null);
            }
        } catch (err: any) {
            setUploadProgress(null);
            alert(err.message || 'Upload failed. You can paste an image URL instead.');
        }
    };

    // Form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanName = displayName.trim();
        const cleanUsername = username.trim().toLowerCase();

        if (!cleanName) {
            alert('Please enter a display name.');
            return;
        }

        const usernameErr = validateUsernameFormat(cleanUsername);
        if (usernameErr) {
            setUsernameError(usernameErr);
            return;
        }

        setIsSaving(true);
        try {
            const success = await onSave({
                display_name: cleanName,
                username: cleanUsername,
                bio: bio.trim(),
                avatar_url: avatarUrl.trim(),
                is_private: isPrivate,
                share_activity: shareActivity,
                show_online: showOnline,
                allow_discovery: allowDiscovery,
            });

            if (success) {
                onClose();
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleAttemptClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Container */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-gray-200 dark:border-gray-800 my-auto overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-5">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white">Edit Profile</h3>
                        <p className="text-xs text-gray-400">Update your public identity and privacy controls</p>
                    </div>
                    <button
                        onClick={handleAttemptClose}
                        className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full transition-colors"
                        title="Close"
                    >
                        <IoClose size={22} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto px-1 custom-scrollbar">
                    {/* Avatar Upload / URL Section */}
                    <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-200/50 dark:border-white/5">
                        <div className="relative group">
                            <img
                                src={avatarUrl || '/vibeon-logo.png'}
                                alt="Avatar Preview"
                                className="w-20 h-20 rounded-full border-2 border-primary object-cover shadow-md"
                            />
                            {uploadProgress && (
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-[10px] text-white font-bold text-center px-1">
                                    {uploadProgress}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
                                <IoCameraOutline size={16} />
                                <span>Upload Photo</span>
                                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                            </label>
                            {avatarUrl && (
                                <button
                                    type="button"
                                    onClick={() => setAvatarUrl('')}
                                    className="px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold transition-colors"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                        <input
                            type="url"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Or paste an image URL..."
                        />
                    </div>

                    {/* Display Name */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                            Display Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                            maxLength={50}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="e.g. Alex Rivera"
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold uppercase text-gray-400">
                                Username <span className="text-red-500">*</span>
                            </label>
                            {isCheckingUsername && <span className="text-[10px] text-primary animate-pulse">Checking...</span>}
                        </div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => handleUsernameChange(e.target.value)}
                            required
                            minLength={3}
                            maxLength={30}
                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                                usernameError
                                    ? 'border-red-500 focus:ring-red-500/50'
                                    : 'border-gray-200 dark:border-gray-700 focus:ring-primary/50'
                            }`}
                            placeholder="alphanumeric and underscore only"
                        />
                        {usernameError && (
                            <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                                <IoAlertCircleOutline /> {usernameError}
                            </p>
                        )}
                    </div>

                    {/* Bio */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold uppercase text-gray-400">Bio</label>
                            <span className="text-[10px] text-gray-400">{bio.length}/160</span>
                        </div>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            maxLength={160}
                            rows={2}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="Share your musical taste and favorite vibes..."
                        />
                    </div>

                    {/* Privacy Controls Section */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-200/50 dark:border-white/5 space-y-3.5 pt-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                            <IoShieldCheckmarkOutline /> Privacy Controls
                        </h4>

                        {/* Private Account */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-900 dark:text-white">Private Profile</p>
                                <p className="text-[10px] text-gray-500">Only approved friends can view your library and listening activity</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPrivate(!isPrivate)}
                                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${isPrivate ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                            >
                                <motion.div animate={{ x: isPrivate ? 18 : 2 }} className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.5" />
                            </button>
                        </div>

                        {/* Share Listening Activity */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-900 dark:text-white">Share Listening Activity</p>
                                <p className="text-[10px] text-gray-500">Broadcast currently playing song to friends in real time</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShareActivity(!shareActivity)}
                                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${shareActivity ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                            >
                                <motion.div animate={{ x: shareActivity ? 18 : 2 }} className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.5" />
                            </button>
                        </div>

                        {/* Show Online Status */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-900 dark:text-white">Show Online Status</p>
                                <p className="text-[10px] text-gray-500">Let connected friends see when you are active on Vibe On</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowOnline(!showOnline)}
                                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${showOnline ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                            >
                                <motion.div animate={{ x: showOnline ? 18 : 2 }} className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.5" />
                            </button>
                        </div>

                        {/* Allow Discovery */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-900 dark:text-white">Allow Profile Discovery</p>
                                <p className="text-[10px] text-gray-500">Allow users to discover your profile through search</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAllowDiscovery(!allowDiscovery)}
                                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${allowDiscovery ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                            >
                                <motion.div animate={{ x: allowDiscovery ? 18 : 2 }} className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.5" />
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={handleAttemptClose}
                            className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || Boolean(usernameError) || isCheckingUsername}
                            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer"
                        >
                            {isSaving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>

                {/* Discard Unsaved Changes Confirmation Dialog */}
                {showDiscardConfirm && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center p-5">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl max-w-sm w-full text-center space-y-3 border border-gray-200 dark:border-white/10">
                            <h4 className="text-base font-bold text-gray-900 dark:text-white">Discard Unsaved Changes?</h4>
                            <p className="text-xs text-gray-500">
                                You have unsaved profile modifications. Are you sure you want to discard them?
                            </p>
                            <div className="flex items-center justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDiscardConfirm(false)}
                                    className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold"
                                >
                                    Keep Editing
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDiscardConfirm(false);
                                        onClose();
                                    }}
                                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold"
                                >
                                    Discard Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default EditProfileModal;
