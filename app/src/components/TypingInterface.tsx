import React, { useState, useRef, ComponentProps } from "react";
import { connect } from "react-redux";
import { Button } from "reactstrap";

import { AppState } from "redux/store";
import * as actions from "redux/actions/actions";
import { ExtractPropsType } from "utils/reduxUtils";
import { useConstRefFunc, useTimeout, useInterval } from "utils/customHooks";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const Typo = require("typo-js");
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const dictionary = new Typo("en_US", false, false, {
  dictionaryPath: "dictionaries",
});

const mapStateToProps = (state: AppState) => {
  return {
    currentWord: state.main.currentWord,
  };
};

const mapDispatchToProps = actions;

const connectComponent = connect(mapStateToProps, mapDispatchToProps);
type Props = ExtractPropsType<typeof connectComponent>;

const TypingInterface = (props: Props) => {
  const [shift, setShift] = useState(true);
  const [caps, setCaps] = useState(false);
  const [showPunctuation, setShowPunctuation] = useState(false);
  const [numberKeyboard, setNumberKeyboard] = useState(false);
  const [autoCorrected, setAutoCorrected] = useState("");
  const [dontAutoCorrect, setDontAutoCorrect] = useState(false);
  const tappedCharacter = useRef<string | null>(null);
  const repeatedBackspace = useRef(false);
  const repeatedSpace = useRef(false);

  const Key = useConstRefFunc(
    ({
      char,
      display,
      ...buttonProps
    }: {
      char: string;
      display?: string;
    } & ComponentProps<typeof Button>) => (
      <Button
        {...buttonProps}
        outline
        onTouchStart={(e) => {
          if (buttonProps.onTouchStart) {
            buttonProps.onTouchStart(e);
            if (e.defaultPrevented) {
              return;
            }
          }

          tappedCharacter.current = char;
        }}
        onClick={(e) => {
          if (buttonProps.onClick) {
            buttonProps.onClick(e);
            if (e.defaultPrevented) {
              return;
            }
          }

          const clickedChar = tappedCharacter.current
            ? tappedCharacter.current
            : char; // Fix weird bug on mobile where the wrong button gets clicked
          tappedCharacter.current = null;
          let autoCorrectedWord = "";
          if (
            /\s/.test(props.currentWord.slice(-1)) &&
            !/\s/.test(clickedChar)
          ) {
            props.pushCurrentWord();
            props.setCurrentWord(clickedChar);
            setDontAutoCorrect(false);
          } else {
            let word = props.currentWord;
            if (clickedChar === " ") {
              if (
                !dontAutoCorrect &&
                word.trim() === word &&
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                !dictionary.check(word)
              ) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
                const suggestions = dictionary.suggest(word, 1);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                if (suggestions.length > 0) {
                  autoCorrectedWord = word + clickedChar;
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                  word = suggestions[0];
                }
              }
            }
            props.setCurrentWord(word + clickedChar);
          }
          setShift(false);
          setShowPunctuation(clickedChar === " ");
          setAutoCorrected(autoCorrectedWord);
        }}
      >
        {display ? display : char}
      </Button>
    )
  );

  const LetterKey = useConstRefFunc(
    ({
      upperChar,
      lowerChar,
      ...buttonProps
    }: {
      upperChar: string;
      lowerChar: string;
    } & ComponentProps<typeof Button>) => (
      <Key char={shift || caps ? upperChar : lowerChar} {...buttonProps} />
    )
  );

  const PunctuationKey = useConstRefFunc(({ char }: { char: string }) => (
    <Button
      outline
      onClick={() => {
        props.setCurrentWord(
          props.currentWord.slice(0, -1) + char + (numberKeyboard ? "" : " ")
        );
        setShift(
          numberKeyboard ? false : char === "." || char === "?" || char === "!"
        );
        if (autoCorrected !== "") {
          setAutoCorrected(
            autoCorrected.slice(0, -1) + char + (numberKeyboard ? "" : " ")
          );
        }
        setShowPunctuation(false);
      }}
    >
      {char}
    </Button>
  ));

  const backspace = () => {
    if (props.currentWord.length) {
      if (autoCorrected !== "") {
        if (props.currentWord.slice(-1) === " ") {
          setAutoCorrected(autoCorrected.slice(0, -1));
        } else {
          setAutoCorrected("");
          setDontAutoCorrect(true);
        }
      }
      props.setCurrentWord(props.currentWord.slice(0, -1));
    } else {
      props.popLastWord();
      setDontAutoCorrect(false);
    }
    setShift(false);
  };

  const [startBackspaceInterval, clearBackspaceInterval] = useInterval(() => {
    backspace();
  }, 50);

  const [startBackspaceTimeout, clearBackspaceTimeout] = useTimeout(() => {
    backspace();
    repeatedBackspace.current = true;
    startBackspaceInterval();
  }, 500);

  const [startSpaceInterval, clearSpaceInterval] = useInterval(() => {
    props.setCurrentWord(props.currentWord + " ");
    setShift(false);
  }, 50);

  const [startSpaceTimeout, clearSpaceTimeout] = useTimeout(() => {
    props.setCurrentWord(props.currentWord + " ");
    setShift(false);
    repeatedSpace.current = true;
    startSpaceInterval();
  }, 500);

  return (
    <div className="TypingInterface">
      <div id="top_bar">
        <Button
          outline
          id="switch_keyboard"
          onClick={() => setNumberKeyboard(!numberKeyboard)}
        >
          {numberKeyboard ? "ABC" : "123"}
        </Button>
        <div
          id="word_container"
          onClick={() => {
            if (autoCorrected !== "") {
              props.setCurrentWord(autoCorrected);
              setAutoCorrected("");
              setDontAutoCorrect(true);
            }
          }}
        >
          <span
            id="word"
            dir="ltr"
            className={autoCorrected !== "" ? "auto-corrected" : ""}
          >
            {props.currentWord.replaceAll("\n", " ") + "???"}
          </span>
        </div>
        <Key char={"\n"} display="???" id="enter" />
      </div>

      {numberKeyboard ? (
        <div>
          <div>
            <Key char="7" />
            <Key char="8" />
            <Key char="9" />
            <Key char="@" />
            <Key char="-" />
          </div>
          <div>
            <Key char="4" />
            <Key char="5" />
            <Key char="6" />
            <Key char="$" />
            <Key char="%" />
          </div>
          <div>
            <Key char="1" />
            <Key char="2" />
            <Key char="3" />
            <Key char="'" onClick={() => setNumberKeyboard(false)} />
            <Key char="/" />
          </div>
        </div>
      ) : (
        <div id="qwerty">
          <div>
            <LetterKey upperChar="Q" lowerChar="q" />
            <LetterKey upperChar="W" lowerChar="w" />
            <LetterKey upperChar="E" lowerChar="e" />
            <LetterKey upperChar="R" lowerChar="r" />
            <LetterKey upperChar="T" lowerChar="t" />
            <LetterKey upperChar="Y" lowerChar="y" />
            <LetterKey upperChar="U" lowerChar="u" />
            <LetterKey upperChar="I" lowerChar="i" />
            <LetterKey upperChar="O" lowerChar="o" />
            <LetterKey upperChar="P" lowerChar="p" />
          </div>
          <div>
            <LetterKey upperChar="A" lowerChar="a" />
            <LetterKey upperChar="S" lowerChar="s" />
            <LetterKey upperChar="D" lowerChar="d" />
            <LetterKey upperChar="F" lowerChar="f" />
            <LetterKey upperChar="G" lowerChar="g" />
            <LetterKey upperChar="H" lowerChar="h" />
            <LetterKey upperChar="J" lowerChar="j" />
            <LetterKey upperChar="K" lowerChar="k" />
            <LetterKey upperChar="L" lowerChar="l" />
          </div>
          <div>
            <LetterKey upperChar="Z" lowerChar="z" />
            <LetterKey upperChar="X" lowerChar="x" />
            <LetterKey upperChar="C" lowerChar="c" />
            <LetterKey upperChar="V" lowerChar="v" />
            <LetterKey upperChar="B" lowerChar="b" />
            <LetterKey upperChar="N" lowerChar="n" />
            <LetterKey upperChar="M" lowerChar="m" />
          </div>
        </div>
      )}

      <div>
        {numberKeyboard ? (
          <Key char="0" />
        ) : (
          <Button
            outline={!shift && !caps}
            id="shift"
            onClick={caps ? () => setCaps(false) : () => setShift(!shift)}
            onDoubleClick={() => {
              setCaps(true);
              setShift(false);
            }}
          >
            {caps ? "???" : "???"}
          </Button>
        )}
        {showPunctuation ? (
          <span id="punctuation">
            <PunctuationKey char="." />
            <PunctuationKey char="," />
            <PunctuationKey char="?" />
            <PunctuationKey char="!" />
          </span>
        ) : (
          <span>
            <Key
              char=" "
              display="???"
              id="space"
              onClick={(e) => {
                if (repeatedSpace.current) {
                  e.preventDefault();
                }
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                repeatedSpace.current = false;
                startSpaceTimeout();
                document.addEventListener(
                  "touchend",
                  () => {
                    clearSpaceTimeout();
                    clearSpaceInterval();
                  },
                  { once: true }
                );
              }}
              onMouseDown={() => {
                repeatedSpace.current = false;
                startSpaceTimeout();
                document.addEventListener(
                  "mouseup",
                  () => {
                    clearSpaceTimeout();
                    clearSpaceInterval();
                  },
                  { once: true }
                );
              }}
            />
            <Button
              outline
              id="backspace"
              onClick={() => {
                if (repeatedBackspace.current) {
                  return;
                }
                backspace();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                repeatedBackspace.current = false;
                startBackspaceTimeout();
                document.addEventListener(
                  "touchend",
                  () => {
                    clearBackspaceTimeout();
                    clearBackspaceInterval();
                  },
                  { once: true }
                );
              }}
              onMouseDown={() => {
                repeatedBackspace.current = false;
                startBackspaceTimeout();
                document.addEventListener(
                  "mouseup",
                  () => {
                    clearBackspaceTimeout();
                    clearBackspaceInterval();
                  },
                  { once: true }
                );
              }}
            >
              ???
            </Button>
          </span>
        )}
      </div>
    </div>
  );
};

export default connectComponent(TypingInterface);
