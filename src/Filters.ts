export class Filters {
    static noFilter(word: string, letter:string, position: number): boolean {
        return true;
    }

    static notInWord(word: string, letter:string, position: number) {
        return !word.includes(letter);
    }

    static wrongPosition(word: string, letter:string, position: number) {
        return word.includes(letter) && word.charAt(position) != letter;
    }

    static rightPosition(word: string, letter:string, position: number) {
        return word.charAt(position) == letter;
    }
}