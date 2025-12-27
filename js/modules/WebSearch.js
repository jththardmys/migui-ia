class WebSearch {
    constructor() {
        this.api = 'https://es.wikipedia.org/w/api.php?origin=*&action=query&list=search&format=json&srsearch=';
    }

    async resolve(query) {
        // 1. Clean query
        const cleanQuery = this.clean(query);

        // 2. Try Specific Search
        let results = await this.search(cleanQuery);

        // 3. Fallback: Keywords
        if (!results || results.length === 0) {
            const keywords = this.extractKeywords(cleanQuery);
            if (keywords.length > 0) {
                console.log(`[Search] Fallback to keywords: ${keywords}`);
                results = await this.search(keywords);
            }
        }

        // 4. Format Answer
        if (results && results.length > 0) {
            const best = results[0];
            return {
                found: true,
                title: best.title,
                snippet: best.snippet.replace(/<[^>]*>/g, ''),
                source: 'Wikipedia'
            };
        }

        return { found: false, searchUrl: `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}` };
    }

    async search(term) {
        try {
            const response = await fetch(this.api + encodeURIComponent(term));
            const data = await response.json();
            return data.query ? data.query.search : [];
        } catch (e) {
            console.error("Search failed", e);
            return [];
        }
    }

    clean(text) {
        return text
            .replace(/dime la/gi, '')
            .replace(/dime el/gi, '')
            .replace(/que es/gi, '')
            .replace(/quien es/gi, '')
            .replace(/busca sobre/gi, '')
            .replace(/investiga/gi, '')
            .replace(/calcula/gi, '') // Just in case
            .trim();
    }

    extractKeywords(text) {
        // Simple heuristic: words > 4 chars, capitalized words
        return text.split(' ')
            .filter(w => w.length > 4 || w[0] === w[0].toUpperCase())
            .join(' ');
    }
}
