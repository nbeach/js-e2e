const expect = chai.expect;

it.parameterized = (name, test, table) => {
    table.forEach(data => {
        it(name.replace("#case", data.case), () => { test(data) });
    });
};

describe("The test framework", function () {

    let $document;
    beforeEach(() => $document = $(testFrame.document()));

    describe("can access the DOM and", () => {

        it("read values", () => {
            expect($document.find("#text").text()).to.equal("Some text");
        });

        it("modify input fields", () => {
            let searchField = $document.find('#text-input');
            searchField.val("cake");
            expect(searchField.val()).to.equal("cake");
        });

    });

    describe("can simulate", () => {
        let events = {
            mouse: ["mouseup", "mousedown", "click"],
            keyboard: ["keypress", "keyup", "keydown"],
            input: ["focus", "change"]
        };
        events.all = [].concat(events.mouse, events.keyboard, events.input);

        it.parameterized("#case on an input",
            (test) => {
                let input = $document.find('#button')[0];
                simulant.fire(input, test.event, {});
                expect($document.find('#last-button-event').text()).to.equal(test.event);
            },
            events.mouse.map((event) => { return{ case: event, event: event } })
        );

        it.parameterized("#case on an input",
            (test) => {
                let button = $document.find('#text-input')[0];
                simulant.fire(button, test.event, {});
                expect($document.find('#last-input-event').text()).to.equal(test.event);
            },
            events.all.map((event) => { return{ case: event, event: event } })
        );

    });


});