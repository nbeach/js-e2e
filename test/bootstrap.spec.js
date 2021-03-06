const expect = require('chai').expect;
const sinon = require('sinon');
const _ = require('lodash');
const stubObject = require("./test-utils").stubObject;
const Bootstrap = require('../src/bootstrap');

describe("Bootstrap", () => {
    let fs, config, server, runner, babel, bootstrap, browserLaunchers;

    beforeEach(() => {
        fs = stubObject(["readFileSync"]);
        server = stubObject(["start", "port", "endpoint", "scripts", "target"], true);
        runner = stubObject(["server", "reporters", "launchers", "run"], true);
        babel = stubObject(["transform"]);

        config = {
            target: "http://www.test.com",
            endpoint: "/test-endpoint",
            port: "8000",
            plugins: [
                hooks => hooks.beforeSpecs.include("/before/file.js"),
                hooks => hooks.afterSpecs.include("/after/file.js")
            ],
            specs: ["fooSpec.js", "barSpec.js"]
        };

        browserLaunchers =  {
            'phantomjs': function(url) {
                this.configuredName = 'phantomjs-instance';
                this.configuredUrl = url;
            },
            'some-browser': function(url) {
                this.configuredName = 'some-browser-instance';
                this.configuredUrl = url;
            }
        };

        bootstrap = new Bootstrap(fs, babel, runner, server, browserLaunchers, config, "../test/");
    });

    describe("run()", () => {

        beforeEach(() => {
            babel.transform.returns({ code: ""});
        });


        describe("add browser launchers to the runner and ", () => {

            it("uses the browser set in the config", () => {
                config.browsers = ['some-browser'];

                bootstrap.run();
                let launcher = runner.launchers.firstCall.args[0][0];
                expect(launcher.configuredName).to.deep.equal('some-browser-instance');
                expect(launcher.configuredUrl).to.deep.equal('http://localhost:8000/test-endpoint');
            });

            it("defaults to phantomjs if no browsers are configured", () => {
                bootstrap.run();
                let launcher = runner.launchers.firstCall.args[0][0];
                expect(launcher.configuredName).to.deep.equal('phantomjs-instance');
                expect(launcher.configuredUrl).to.deep.equal('http://localhost:8000/test-endpoint');
            });

        });


        it("configures the server", () => {
            bootstrap.run();

            expect(server.port.calledWith("8000")).to.be.true;
            expect(server.endpoint.calledWith("/test-endpoint")).to.be.true;
            expect(server.target.calledWith("http://www.test.com")).to.be.true;
        });

        it("sets the server on the runner", () => {
            bootstrap.run();
            expect(runner.server.firstCall.args[0]).to.equal(server);
        });

        it("runs the runner", () => {
            bootstrap.run();
            expect(runner.run.called).to.be.true;
        });

        it("sets the reporters on the runner", () => {
            bootstrap.run();

            let reporters = runner.reporters.firstCall.args[0];
            expect(reporters.length).to.equal(1);
            expect(_.isFunction(reporters[0])).to.be.true;
        });

        it("loads the event simulator and includes it in the scrips", () => {
            fs.readFileSync = (path) => {
                return path.endsWith("/../node_modules/simulant/dist/simulant.umd.js") ? "console.log('eventSimulator');" : null;
            };

            bootstrap.run();

            expect(server.scripts.firstCall.args[0][0]).to.equal("console.log('eventSimulator');");
        });

        it("loads the test frame and includes it in the scrips", () => {
            fs.readFileSync = (path) => {
                return path.endsWith("/browser/test-frame.js") ? "console.log('testFrame');" : null;
            };

            bootstrap.run();

            expect(server.scripts.firstCall.args[0][1]).to.equal("console.log('testFrame');");
        });

        it("loads the test files and transforms from ES5 to ES6", () => {
            babel.transform.returns({ code: "console.log('babel');"});

            bootstrap.run();

            let scripts = server.scripts.firstCall.args[0];
            expect(scripts[3]).to.equal("console.log('babel');");
            expect(scripts[4]).to.equal("console.log('babel');");
        });

        describe("loads configured plugins and", () => {

            it("allows plugins to add scripts before and after the test scripts", () => {
                babel.transform.returns({ code: "console.log('foobar');"});
                fs.readFileSync.withArgs("/before/file.js").returns("console.log('before');");
                fs.readFileSync.withArgs("/after/file.js").returns("console.log('after');");

                bootstrap.run();

                expect(server.scripts.firstCall.args[0][2]).to.equal("console.log('before');");
                expect(server.scripts.firstCall.args[0][5]).to.equal("console.log('after');");
            });

        });

    });

});