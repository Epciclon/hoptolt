export function calculateEstimatedWeight(purpose: string, ageMonths: number): number {
    if (purpose === 'Engorde') {
        const table: Record<number, number> = {
            0: 0.05, 1: 0.5, 2: 1.0, 3: 1.5, 4: 2.0, 5: 2.2, 6: 2.4, 7: 2.6
        };
        return ageMonths >= 8 ? 2.8 : (table[ageMonths] || 2.8);
    } else if (purpose === 'Reproducción') {
        const table: Record<number, number> = {
            0: 0.05, 1: 0.4, 2: 0.8, 3: 1.2, 4: 1.6, 5: 2.0, 6: 2.15, 7: 2.3, 8: 2.45, 9: 2.6, 10: 2.75, 11: 2.9
        };
        return ageMonths >= 12 ? 3.0 : (table[ageMonths] || 3.0);
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
