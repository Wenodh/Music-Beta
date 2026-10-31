import { DialogueItem } from '../types';

export const ORIGINAL_DIALOGUES: DialogueItem[] = [
    // English
    { id: 'en-start-1', text: "Let's drop the beat!", language: 'english', trigger: 'start' },
    { id: 'en-start-2', text: 'Catch the rhythm!', language: 'english', trigger: 'start' },
    { id: 'en-go-1', text: 'Out of rhythm! Try again.', language: 'english', trigger: 'game-over' },
    { id: 'en-go-2', text: 'Mic drop... but not in a good way!', language: 'english', trigger: 'game-over' },
    { id: 'en-mile-1', text: 'Crowd goes wild! +50!', language: 'english', trigger: 'milestone' },
    { id: 'en-mile-2', text: 'Certified Platinum run!', language: 'english', trigger: 'milestone' },
    { id: 'en-spec-1', text: 'Golden Vinyl collected! Bonus beat!', language: 'english', trigger: 'special-item' },
    { id: 'en-high-1', text: 'New High Score! Hall of Fame!', language: 'english', trigger: 'new-high-score' },

    // Telugu
    { id: 'te-start-1', text: 'BGM start chey mama!', language: 'telugu', trigger: 'start' },
    { id: 'te-start-2', text: 'Mass beat tho ready ga unna!', language: 'telugu', trigger: 'start' },
    { id: 'te-go-1', text: 'Sye aatallo ila out ayyava mama?!', language: 'telugu', trigger: 'game-over' },
    { id: 'te-go-2', text: 'Interval twist vachindi...', language: 'telugu', trigger: 'game-over' },
    { id: 'te-mile-1', text: 'Theatre lo whistles!', language: 'telugu', trigger: 'milestone' },
    { id: 'te-spec-1', text: 'Special beat catch chesav!', language: 'telugu', trigger: 'special-item' },
    { id: 'te-high-1', text: 'Record baddhalayyindi!', language: 'telugu', trigger: 'new-high-score' },

    // Hindi
    { id: 'hi-start-1', text: 'Sur aur taal ke sath shuru!', language: 'hindi', trigger: 'start' },
    { id: 'hi-start-2', text: 'Mausam sangeet ka hai!', language: 'hindi', trigger: 'start' },
    { id: 'hi-go-1', text: 'Besura twist! Phir se bajao.', language: 'hindi', trigger: 'game-over' },
    { id: 'hi-go-2', text: 'Dhol thoda ruk gaya!', language: 'hindi', trigger: 'game-over' },
    { id: 'hi-mile-1', text: 'Hit track chal raha hai!', language: 'hindi', trigger: 'milestone' },
    { id: 'hi-spec-1', text: 'Golden cassette mili!', language: 'hindi', trigger: 'special-item' },
    { id: 'hi-high-1', text: 'Naya Blockbuster Score!', language: 'hindi', trigger: 'new-high-score' },
];

export class DialogueEngine {
    public static getRandomDialogue(
        trigger: 'start' | 'game-over' | 'milestone' | 'special-item' | 'new-high-score',
        preferredLanguage: 'auto' | 'english' | 'telugu' | 'hindi',
        songLanguage?: string
    ): string {
        let lang: 'english' | 'telugu' | 'hindi' = 'english';

        if (preferredLanguage !== 'auto') {
            lang = preferredLanguage;
        } else if (songLanguage) {
            const lower = songLanguage.toLowerCase();
            if (lower.includes('telugu')) lang = 'telugu';
            else if (lower.includes('hindi')) lang = 'hindi';
            else lang = 'english';
        }

        const matches = ORIGINAL_DIALOGUES.filter(d => d.trigger === trigger && d.language === lang);
        if (matches.length === 0) {
            const fallback = ORIGINAL_DIALOGUES.filter(d => d.trigger === trigger);
            return fallback.length > 0 ? fallback[Math.floor(Math.random() * fallback.length)].text : 'Great play!';
        }

        return matches[Math.floor(Math.random() * matches.length)].text;
    }
}
