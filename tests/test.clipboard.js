import * as Log from '../core/util/logging.js';
import Clipboard from '../core/clipboard.js';

describe('Async Clipboard API', function () {
    "use strict";

    let targetMock;
    let clipboard;
    let onReadSpy;

    beforeEach(function () {
        targetMock = document.createElement("canvas");

        clipboard = new Clipboard(targetMock);

        onReadSpy = sinon.spy();
        clipboard.onRead = onReadSpy;

        global.navigator = {
            clipboard: {
                writeText: sinon.stub().resolves(),
                readText: sinon.stub().resolves("random text 123"),
            },
            permissions: {
                query: sinon.stub().resolves({ state: "granted" }),
            },
        };
    });

    afterEach(function () {
        sinon.restore();
        targetMock = null;
        clipboard = null;
        onReadSpy = null;
    });

    it("isSupported is true when API available", function () {
        expect(clipboard.isSupported).to.be.true;
    });

    it("isSupported is false when  API missing", function () {
        delete global.navigator.clipboard.writeText;
        delete global.navigator.clipboard.readText;
        const clipboard2 = new Clipboard(targetMock);
        expect(clipboard2.isSupported).to.be.false;
    });

    it("_hasPermissions is true if granted or prompt", async function () {
        navigator.permissions.query.resolves({ state: "granted" });
        const resultGranted = await clipboard._hasPermissions();
        expect(resultGranted).to.be.true;
        navigator.permissions.query.resolves({ state: "prompt" });
        const resultPrompt = await clipboard._hasPermissions();
        expect(resultPrompt).to.be.true;
    });

    it("_hasPermissions is false if not granted/prompt", async function () {
        navigator.permissions.query.resolves({ state: "ANY" });
        const result = await clipboard._hasPermissions();
        expect(result).to.be.false;
    });

    it("_hasPermissions is false on query error", async function () {
        navigator.permissions.query.rejects(new Error("fail"));
        const result = await clipboard._hasPermissions();
        expect(result).to.be.false;
    });

    it("writeClipboard calls clipboard.writeText", async function () {
        const text = "writing some text to clipboard";
        await clipboard.writeClipboard(text);
        sinon.assert.calledOnceWithExactly(navigator.clipboard.writeText, text);
    });

    it("writeClipboard logs error on write fail", async function () {
        const text = "more text to clipboard";
        const errorLogStub = sinon.stub(Log, "Error");
        navigator.clipboard.writeText.rejects(new Error("fail"));
        await clipboard.writeClipboard(text);
        sinon.assert.calledOnce(errorLogStub);
        sinon.assert.match(errorLogStub.firstCall.args[0], /Clipboard write failed/i);
        sinon.assert.match(errorLogStub.firstCall.args[1].message, /fail/);
        errorLogStub.restore();
    });

    it("_handleFocus calls clipboard.readText", async function () {
        await clipboard._handleFocus(new Event("focus"));
        sinon.assert.calledOnce(navigator.clipboard.readText);
    });

    it('_handleFocus calls onRead after read', async function () {
        await clipboard._handleFocus(new Event("focus"));
        sinon.assert.calledOnceWithExactly(onReadSpy, "random text 123");
    });

    it("_handleFocus logs error on read fail", async function () {
        const errorLogStub = sinon.stub(Log, "Error");
        navigator.clipboard.readText.rejects(new Error("fail"));
        await clipboard._handleFocus(new Event("focus"));
        sinon.assert.calledOnce(errorLogStub);
        sinon.assert.match(errorLogStub.firstCall.args[0], /Clipboard read failed/i);
        sinon.assert.match(errorLogStub.firstCall.args[1].message, /fail/);
        errorLogStub.restore();
    });

});
