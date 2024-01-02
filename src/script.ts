
import { applyFilter, filters, FilterType, cycleFilter } from "./Filters";
import { RatedWord } from "./wordRator";

import { wordsLengthFive as wordsShort } from "./wordsLengthFiveShort";
import { wordsLengthFive as wordsLong } from "./wordsLengthFiveLong";



let wordRatingWorker: Worker;

if (window.Worker) {
    wordRatingWorker = new Worker(new URL('./wordRator.ts', import.meta.url), {type: 'module'});
    
    wordRatingWorker.onmessage = function(e) {
        const filteredWords = filterWords(wordsShort, guesses);
        if (filteredWords.length < 3) {
            updateShownWords(filteredWords);
        }
        else {
            const ratedFilteredWords = e.data as Array<RatedWord>;
            updateShownWords(ratedFilteredWords.map(ratedWord => ratedWord.word).slice(0, 20))
        }   
    }

    wordRatingWorker.onerror = function(error) {
        console.error('Worker error:', error);
    };
} 
else {
    console.log('Your browser doesn\'t support web workers.');
}

window.addEventListener('beforeunload', () => {
    if (wordRatingWorker) {
        wordRatingWorker.terminate();
    }
});


type LetterGuess = {
    position: number,
    letter: string,
    filter: string
}

let guesses: Array<LetterGuess> = [...Array(5*6).keys()].map(i => {
        return {position:i, letter: "", filter:filters.NotInWord.toString()}
});

function filterWords(words: Array<string>, guesses: Array<LetterGuess>): Array<string> {
    let wordsFiltered: Array<string> = words;
    for (const guess of guesses) {
        if (guess.letter.length > 0) {
            const filterType = guess.filter as FilterType;
            wordsFiltered = wordsFiltered.filter((word) => {
                return applyFilter(filterType, word, guess.letter, guess.position % 5)
            });
        }
    }
    return wordsFiltered;
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

    updateRecommendList();
    if (button) {
        button.addEventListener('click', updateRecommendList);
    } else {
        console.error('Button not found!');3
    }
});

function updateRecommendList() {
    let filteredWords = filterWords(wordsShort, guesses);
    console.log(filteredWords);

    const counter = document.getElementById("counter")
    if (counter) {
        counter.innerHTML = filteredWords.length.toString();
    }



    const data = {answers: filteredWords, guesses: wordsLong}; 
    wordRatingWorker.postMessage(data);    
}

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


