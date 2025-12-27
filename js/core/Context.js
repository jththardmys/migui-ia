class ContextManager {
    constructor() {
        // "5GB RAM" Simulation = Large Context Window
        this.limit = 50;
        this.history = [];
        this.knowledgeBuffer = []; // Fact memory
        this.currentTopic = null;
    }

    add(role, text) {
        // Timestamp for temporal awareness
        const entry = { role, text, timestamp: Date.now() };
        this.history.push(entry);

        // Maintain sliding window
        if (this.history.length > this.limit) {
            this.history.shift();
        }
    }

    addKnowledge(fact) {
        // Stores facts found during searches
        this.knowledgeBuffer.push(fact);
        if (this.knowledgeBuffer.length > 20) this.knowledgeBuffer.shift();
    }

    setTopic(topic) {
        this.currentTopic = topic;
    }

    getTopic() {
        return this.currentTopic;
    }

    getLastUserMessage() {
        for (let i = this.history.length - 1; i >= 0; i--) {
            if (this.history[i].role === 'user') return this.history[i].text;
        }
        return null;
    }

    // Simulations of "Attention" mechanism
    getRelevantContext(query) {
        // Simple keyword matching to find related past messages
        const keywords = query.split(' ').filter(w => w.length > 4);
        if (keywords.length === 0) return this.getLastUserMessage();

        const relevant = this.history.filter(h =>
            keywords.some(k => h.text.toLowerCase().includes(k.toLowerCase()))
        );

        return relevant.map(r => r.text).join(' ... ');
    }

    clear() {
        this.history = [];
        this.knowledgeBuffer = [];
        this.currentTopic = null;
    }
}
