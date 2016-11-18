/*eslint max-nested-callbacks:0*/
"use strict";
import { assert } from "chai";
import TwitterFeedsRoute from "../../../src/routes/helpers/TwitterFeedsRoute.js";
import TwitterClient from "../../../src/twitter/TwitterClient";
import TwitterRequestHandler from "../../../src/twitter/TwitterRequestHandler.js";
import ApplicationConfig from "../../../src/config/ApplicationConfig.js";
import LogTestHelper from "../../helpers/LogTestHelper";
import Logger from "../../../src/logging/Logger.js";
import HttpResponseHandler from "../../../../common/src/HttpResponseHandler.js";
import sinon from "sinon";

describe("TwitterFeedsRoute", () => {

    let responseStatus, responseJson;

    function mockResponse() {
        return {
            "status": (status) => {
                if(status) {
                    responseStatus = status;
                }
                return responseStatus;
            },
            "json": (jsonData) => {
                if(jsonData) {
                    responseJson = jsonData;
                }
                return responseJson;
            }
        };
    }

    let applicationConfig = null;

    before("TwitterFeedsRoute", () => {
        applicationConfig = new ApplicationConfig();
        sinon.stub(ApplicationConfig, "instance").returns(applicationConfig);
        sinon.stub(TwitterClient, "logger").returns(LogTestHelper.instance());
        sinon.stub(applicationConfig, "twitter").returns({
            "url": "https://api.twitter.com/1.1",
            "authenticateUrl": "https://api.twitter.com/oauth/authenticate",
            "consumerKey": "consumerKey",
            "consumerSecret": "consimerSecret",
            "timeOut": 10000
        });
        sinon.stub(Logger, "instance").returns(LogTestHelper.instance());
    });

    after("TwitterFeedsRoute", () => {
        ApplicationConfig.instance.restore();
        TwitterClient.logger.restore();
        applicationConfig.twitter.restore();
        Logger.instance.restore();
    });

    describe("handle", () => {
        let sandbox = null;
        beforeEach("twitterRouter", () => {
            sandbox = sinon.sandbox.create();
        });

        afterEach("twitterRouter", () => {
            sandbox.restore();
        });
        it("should respond with bad request if the url is empty", async () => {
            let request = {
                "query": {
                    "url": "",
                    "userName": "testUser"
                }
            };
            let response = mockResponse();

            let twitterFeedRoute = new TwitterFeedsRoute(request, response);
            await Promise.resolve(twitterFeedRoute.handle());
            assert.strictEqual(response.status(), HttpResponseHandler.codes.BAD_REQUEST);
            assert.deepEqual(response.json(), { "message": "bad request" });
            twitterFeedRoute.handle();
        });

        it("should return empty response if url is not present", async () => {
            let request = {
                "query": {
                    "userName": "testUser"
                }
            };
            let response = mockResponse();
            let twitterFeedRoute = new TwitterFeedsRoute(request, response);
            await Promise.resolve(twitterFeedRoute.handle());
            assert.strictEqual(response.status(), HttpResponseHandler.codes.BAD_REQUEST);
            assert.deepEqual(response.json(), { "message": "bad request" });
            twitterFeedRoute.handle();
        });

        it("should return data if the url is valid", async () => {
            let expectedData = { "statuses": [{ "id": 1, "id_str": "123", "text": "Tweet 1" }, { "id": 2, "id_str": "124", "text": "Tweet 2" }] };
            let request = {
                "query": {
                    "url": "@the_hindu",
                    "userName": "testUser"
                }
            };
            let twitterRequestHandler = new TwitterRequestHandler();
            sandbox.stub(TwitterRequestHandler, "instance").returns(twitterRequestHandler);
            let fetchTweetsRequestMock = sandbox.mock(twitterRequestHandler).expects("fetchTweetsRequest");
            fetchTweetsRequestMock.withArgs(request.query.url, request.query.userName).returns(Promise.resolve(expectedData));
            let response = mockResponse();

            let twitterFeedRoute = new TwitterFeedsRoute(request, response);
            await Promise.resolve(twitterFeedRoute.handle());
            assert.deepEqual(response.json(), expectedData);
            fetchTweetsRequestMock.verify();
        });

        it("should return 400 error if url is invalid", async () => {
            let request = {
                "query": {
                    "url": "@myTest",
                    "userName": "testUser"
                }
            };
            let twitterRequestHandler = new TwitterRequestHandler();
            sandbox.stub(TwitterRequestHandler, "instance").returns(twitterRequestHandler);
            let fetchTweetsRequestMock = sandbox.mock(twitterRequestHandler).expects("fetchTweetsRequest");
            fetchTweetsRequestMock.withArgs(request.query.url, request.query.userName).returns(Promise.reject({ "message": "myTest is not a valid twitter handler" }));
            let response = mockResponse();

            let twitterFeedRoute = new TwitterFeedsRoute(request, response);
            await Promise.resolve(twitterFeedRoute.handle());
            assert.strictEqual(response.status(), HttpResponseHandler.codes.BAD_REQUEST);
            assert.deepEqual(response.json(), { "message": "bad request" });
            fetchTweetsRequestMock.verify();
        });

        it("should return 400 error if url is not valid twitter url", async () => {
            let request = {
                "query": {
                    "url": "myTest",
                    "userName": "testUser"
                }
            };
            let twitterRequestHandler = new TwitterRequestHandler();
            sandbox.stub(TwitterRequestHandler, "instance").returns(twitterRequestHandler);
            let fetchTweetsRequestMock = sandbox.mock(twitterRequestHandler).expects("fetchTweetsRequest");
            fetchTweetsRequestMock.withArgs(request.query.url, request.query.userName).returns(Promise.reject({ "message": "myTest is not a valid twitter handler" }));
            let response = mockResponse();

            let twitterFeedRoute = new TwitterFeedsRoute(request, response);
            await Promise.resolve(twitterFeedRoute.handle());
            assert.strictEqual(response.status(), HttpResponseHandler.codes.BAD_REQUEST);
            assert.deepEqual(response.json(), { "message": "bad request" });
            fetchTweetsRequestMock.verify();
        });

        it("should return error if request to url returns error", async () => {
            let request = {
                "query": {
                    "url": "myTest1",
                    "userName": "testUser"
                }
            };
            let url = "myTest1";
            let twitterRequestHandler = new TwitterRequestHandler();
            sandbox.stub(TwitterRequestHandler, "instance").returns(twitterRequestHandler);
            let fetchTweetsRequestMock = sandbox.mock(twitterRequestHandler).expects("fetchTweetsRequest");
            fetchTweetsRequestMock.withArgs(request.query.url, request.query.userName).returns(Promise.reject({ "message": "Request failed for twitter handler " + url }));
            let response = mockResponse();

            let twitterFeedRoute = new TwitterFeedsRoute(request, response);
            await Promise.resolve(twitterFeedRoute.handle());
            assert.strictEqual(response.status(), HttpResponseHandler.codes.BAD_REQUEST);
            assert.deepEqual(response.json(), { "message": "bad request" });
            fetchTweetsRequestMock.verify();
        });
    });
    
});
