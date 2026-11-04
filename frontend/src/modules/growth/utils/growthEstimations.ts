export function calculateEstimatedWeight(purpose: string, ageMonths: number): number {
    if (purpose === 'Engorde') {
        const table: Record<number, number> = {
            0: 0.05, 1: 0.6, 2: 1.7, 3: 2.6, 4: 3.5, 5: 3.9, 6: 4.1, 7: 4.2
        };
        return ageMonths >= 8 ? 4.2 : (table[ageMonths] || 4.2);
    } else if (purpose === 'Reproducción') {
        const table: Record<number, number> = {
            0: 0.05, 1: 0.6, 2: 1.7, 3: 2.4, 4: 3.2, 5: 3.7, 6: 4.0, 7: 4.1
        };
        return ageMonths >= 8 ? 4.2 : (table[ageMonths] || 4.2);
    }
    return 0;
}

export function calculateAgeMonths(birthDateStr: string): number {
    if (!birthDateStr) return 0;
    const bd = new Date(birthDateStr);
    const today = new Date();
    bd.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    let months = (today.getFullYear() - bd.getFullYear()) * 12;
    months -= bd.getMonth();
    months += today.getMonth();
    
    if (today.getDate() < bd.getDate()) {
        months--;
    }
    
    return Math.max(0, months);
}
