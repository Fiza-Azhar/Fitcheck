// 'ready' means the review form is open — reached whether the AI succeeded or
// failed, since a failed analysis still lets the user describe the item by hand.
// 'rejected' is different: the vision model positively identified the photo as
// NOT a clothing item, so the form is blocked and only a retake is offered.
export type AddPhase = 'idle' | 'analysing' | 'ready' | 'saving' | 'rejected';
