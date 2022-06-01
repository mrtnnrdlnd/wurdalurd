export class Filters {
    static noFilter(word: string, letter:string, position: number): boolean {
        return true;
    }

    static notInWord(word: string, letter:string, position: number) {
        return !word.includes(letter.charAt(0));
    }

    static wrongPosition(word: string, letter:string, position: number) {
        return word.includes(letter.charAt(0)) && word.charAt(position) != letter.charAt(0);
    }

    static rightPosition(word: string, letter:string, position: number) {
        return word.charAt(position) == letter.charAt(0);
    }
}