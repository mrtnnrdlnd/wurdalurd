
export type FilterType = 'NotInWord' | 'WrongPosition' | 'RightPosition';

export type WordFilter = (word: string, letter: string, position: number) => boolean;

export const filters: Record<FilterType, WordFilter> = {
    NotInWord: (word, letter) => !word.includes(letter),
    WrongPosition: (word, letter, position) => word.includes(letter) && word.charAt(position) !== letter,
    RightPosition: (word, letter, position) => word.charAt(position) === letter
}

export function applyFilter(filterType: FilterType, word: string, letter: string, position: number): boolean {
    const filterFunction = filters[filterType];
    if (!filterFunction) {
        throw new Error(`Filter function not found for type: ${filterType}`);
    }
    return filterFunction(word, letter, position);
}

export function cycleFilter(currentFilter: string): string {
    const keys = Object.keys(filters) as string[]
    return keys[(keys.indexOf(currentFilter) + 1) % (keys.length)];
}