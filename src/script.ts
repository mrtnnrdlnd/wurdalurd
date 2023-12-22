
// import { ratedWords } from "./ratedWords";

import { wordsLengthFive as wordsShort } from "./wordsLengthFiveShort";
import { wordsLengthFive as wordsLong } from "./wordsLengthFiveLong";


type FilterType = 'NotInWord' | 'WrongPosition' | 'RightPosition';

type WordFilter = (word: string, letter: string, position: number) => boolean;

const filters: Record<FilterType, WordFilter> = {
    NotInWord: (word, letter) => !word.includes(letter),
    WrongPosition: (word, letter, position) => word.includes(letter) && word.charAt(position) !== letter,
    RightPosition: (word, letter, position) => word.charAt(position) === letter
}


function applyFilter(filterType: FilterType, word: string, letter: string, position: number): boolean {
    const filterFunction = filters[filterType];
    if (!filterFunction) {
        throw new Error(`Filter function not found for type: ${filterType}`);
    }
    return filterFunction(word, letter, position);
}


type RatedWord = {
    word: string,
    rating: number
}

type PartlyMemoizedRecursionCall = {NotInWord: Array<string>, WrongPosition: Array<string>, RightPosition: Array<string>};

type MemoCache = Map<string, PartlyMemoizedRecursionCall>;

function rateWordRecursiveSplit(firstPart: string, secondPart: string, words: Array<string>, probability: number, cache: MemoCache, steps: string): number {
    if (words.length === 0 || secondPart.length === 0) return words.length * probability;

    let count = 0;

    let NotInWord: Array<string> = [];
    let WrongPosition: Array<string> = [];
    let RightPosition: Array<string> = [];

    const letter = secondPart[0];
    const position = firstPart.length;
    firstPart = firstPart + secondPart[0];
    secondPart = secondPart.slice(1);

    const memoKey = `${firstPart}-${steps}`;
    if (cache.has(memoKey)) {
        ({ NotInWord, WrongPosition, RightPosition } = cache.get(memoKey)!);
    }
    else {
        for (const w of words) {
            if (filters.NotInWord(w, letter, position)) {
                NotInWord.push(w)
            }
            else if (filters.WrongPosition(w, letter, position)) {
                WrongPosition.push(w)
            }
            else if (filters.RightPosition( w, letter, position)) {
                RightPosition.push(w)
            }
        }

        if (firstPart.length < 4) {
            cache.set(`${firstPart}-${steps}`, {NotInWord, WrongPosition, RightPosition});
        }
    }
    
    count += NotInWord.length > 0 ? rateWordRecursiveSplit(firstPart, secondPart, NotInWord, probability * NotInWord.length/words.length, cache, steps + 'N') : 0;  
    count += WrongPosition.length > 0 ? rateWordRecursiveSplit(firstPart, secondPart, WrongPosition, probability * WrongPosition.length/words.length, cache, steps + 'W') : 0;
    count += RightPosition.length > 0 ? rateWordRecursiveSplit(firstPart, secondPart, RightPosition, probability * RightPosition.length/words.length, cache, steps + 'R') : 0;

    return count;
}




function rateWord(word: string, words: Array<string>, cache: MemoCache): number {
    return rateWordRecursiveSplit("", word, words, 1.0, cache, "");
}

function rateWords(guesses: Array<string>, answers: Array<string>): Array<RatedWord> {
    console.time("ratingWords");
    const cache: MemoCache = new Map();
    const timedRatedWords = answers.map(word => ({ word: word, rating: rateWord(word, guesses, cache) }))
    .sort((a, b) => a.rating - b.rating);
    console.timeEnd("ratingWords");
    console.log(cache)
    return timedRatedWords;
}

type LetterGuess = {
    position: number,
    letter: string,
    filter: string
}

let guesses: Array<LetterGuess> = [...Array(5*6).keys()].map(i => {
        return {position:i, letter: "", filter:filters.NotInWord.toString()}
});

function cycleFilter(currentFilter: string): string {
    const keys = Object.keys(filters) as string[]
    return keys[(keys.indexOf(currentFilter) + 1) % (keys.length)];
}

function createLetterRow(length: number): HTMLElement {
    const element = document.createElement("div");
    element.className = "letter-row";
    return element
}

function createLetterBox(letter: string, type: string): HTMLElement {
    const element = document.createElement(type);
    element.className = "letter-box";
    element.innerHTML = letter;
    return element;
}

document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('updateButton');
    const counter = document.getElementById('counter') ?? document.createElement("div");
    
    const inputDiv : HTMLElement = document.getElementById("input") ?? document.createElement("div");

    for (let i = 0; i < 6; i++) {
        const letterRow = createLetterRow(5);
        for (let j = 0; j < 5; j++) {
            const letterBox = createLetterBox(" ", "input") as HTMLInputElement;
            letterBox.dataset.filter = ""
            letterBox.dataset.position = (i * 5 + j).toString();
            letterBox.maxLength = 1;
            letterBox.onkeyup = (event) => {
                if (event.target) {
                    const target = event.target as HTMLInputElement;
                    updateGuess(target);

                    const currentPosition = parseInt(target.dataset.position ?? "0");
                    if (target.value.length > 0) {
                        const next = document.querySelector<HTMLElement>('[data-position = "' + (currentPosition + 1) + '"]');
                        if (next) {
                            next.focus();
                        }   
                    }
                    else if (event.key == "Backspace") {
                        const previous = document.querySelector<HTMLElement>('[data-position = "' + (currentPosition - 1) + '"]');
                        if (previous) {
                            previous.focus();
                        }   
                    }
                }
            }
            letterBox.onclick = (event) => {
                const target = event.target as HTMLInputElement;
                target.dataset.filter = cycleFilter(target.dataset.filter ?? filters.RightPosition.toString())
                
                updateGuess(target);
                
            }
            letterRow.appendChild(letterBox);
        }
        inputDiv.appendChild(letterRow)
        
    
    }
    const ratedWordsies = rateWords(wordsShort, wordsLong);
    counter.innerHTML = wordsShort.length.toString();
    updateShownWords(ratedWordsies.map(ratedWord => ratedWord.word).slice(0, 20))

    if (button) {
        button.addEventListener('click', () => {
            console.log("clicked")
            let filteredWords = filterWords(wordsShort, guesses);
            console.log(filteredWords);
            let ratedFilteredWords = rateWords(filteredWords, wordsLong);
            console.log(ratedFilteredWords);
            counter.innerHTML = filteredWords.length.toString();
            if (filteredWords.length < 3) {
                updateShownWords(filteredWords)
            }
            else {
                updateShownWords(ratedFilteredWords.map(ratedWord => ratedWord.word).slice(0, 20))
            }
            
        });
    } else {
        console.error('Button not found!');3
    }
});

function updateGuess(letterBox: HTMLInputElement) {
    if (letterBox.dataset.position) {
        const position = parseInt(letterBox.dataset.position);
        const letter = letterBox.value.toLowerCase();
        const filter = letterBox.dataset.filter ?? filters.NotInWord.toString();
        guesses[position] = {position, letter, filter}; 
    }
}

function updateShownWords(words: Array<string>) {
    let outputDiv : HTMLElement = document.getElementById("output") ?? document.createElement("div");
    outputDiv.innerHTML = "";
    words.forEach(word => {
        const letterRow = createLetterRow(5);
        word.split("").forEach(letter => {
            letterRow.appendChild(createLetterBox(letter, "div"));
        });
        outputDiv.appendChild(letterRow)
    });  
}

function filterWords(words: Array<string>, guesses: Array<LetterGuess>): Array<string> {
    let wordsFiltered: Array<string> = words;
    for (const guess of guesses) {
        if (guess.letter.length > 0) {
            // for (const filterType of Object.keys(filteredWords) as FilterType[])
            const filterType = guess.filter as FilterType;
            wordsFiltered = wordsFiltered.filter((word) => {
                return applyFilter(filterType, word, guess.letter, guess.position % 5)
            });
        }
    }
    return wordsFiltered;
}
