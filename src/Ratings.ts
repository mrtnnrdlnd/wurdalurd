export class RatedLetterTree {
    public letter: RatedLetterAtPosition = null;
    
    public set root(root : RatedLetterAtPosition) {
        this.letter = root;
        this.notInWord = new RatedLetterTree();
        this.rightPosition = new RatedLetterTree();
        this.wrongPosition = new RatedLetterTree();
    }
    
    notInWord: RatedLetterTree = null;
    rightPosition: RatedLetterTree = null;
    wrongPosition: RatedLetterTree = null;
}

export interface RatingOfLetter {
    probability: number,
    filteredWords: string[]
}

export interface RatedLetterAtPosition {
    letter: string;
    notInWord: RatingOfLetter,
    rightPosition: RatingOfLetter,
    wrongPosition: RatingOfLetter
}