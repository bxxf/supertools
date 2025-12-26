/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const relay = $root.relay = (() => {

    /**
     * Namespace relay.
     * @exports relay
     * @namespace
     */
    const relay = {};

    relay.Message = (function() {

        /**
         * Properties of a Message.
         * @memberof relay
         * @interface IMessage
         * @property {relay.IToolCall|null} [toolCall] Message toolCall
         * @property {relay.IToolResult|null} [toolResult] Message toolResult
         * @property {relay.IExecute|null} [execute] Message execute
         * @property {relay.IResult|null} [result] Message result
         * @property {relay.IError|null} [error] Message error
         * @property {relay.IPing|null} [ping] Message ping
         * @property {relay.IPong|null} [pong] Message pong
         */

        /**
         * Constructs a new Message.
         * @memberof relay
         * @classdesc Represents a Message.
         * @implements IMessage
         * @constructor
         * @param {relay.IMessage=} [properties] Properties to set
         */
        function Message(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Message toolCall.
         * @member {relay.IToolCall|null|undefined} toolCall
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.toolCall = null;

        /**
         * Message toolResult.
         * @member {relay.IToolResult|null|undefined} toolResult
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.toolResult = null;

        /**
         * Message execute.
         * @member {relay.IExecute|null|undefined} execute
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.execute = null;

        /**
         * Message result.
         * @member {relay.IResult|null|undefined} result
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.result = null;

        /**
         * Message error.
         * @member {relay.IError|null|undefined} error
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.error = null;

        /**
         * Message ping.
         * @member {relay.IPing|null|undefined} ping
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.ping = null;

        /**
         * Message pong.
         * @member {relay.IPong|null|undefined} pong
         * @memberof relay.Message
         * @instance
         */
        Message.prototype.pong = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * Message payload.
         * @member {"toolCall"|"toolResult"|"execute"|"result"|"error"|"ping"|"pong"|undefined} payload
         * @memberof relay.Message
         * @instance
         */
        Object.defineProperty(Message.prototype, "payload", {
            get: $util.oneOfGetter($oneOfFields = ["toolCall", "toolResult", "execute", "result", "error", "ping", "pong"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new Message instance using the specified properties.
         * @function create
         * @memberof relay.Message
         * @static
         * @param {relay.IMessage=} [properties] Properties to set
         * @returns {relay.Message} Message instance
         */
        Message.create = function create(properties) {
            return new Message(properties);
        };

        /**
         * Encodes the specified Message message. Does not implicitly {@link relay.Message.verify|verify} messages.
         * @function encode
         * @memberof relay.Message
         * @static
         * @param {relay.IMessage} message Message message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Message.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.toolCall != null && Object.hasOwnProperty.call(message, "toolCall"))
                $root.relay.ToolCall.encode(message.toolCall, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.toolResult != null && Object.hasOwnProperty.call(message, "toolResult"))
                $root.relay.ToolResult.encode(message.toolResult, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.execute != null && Object.hasOwnProperty.call(message, "execute"))
                $root.relay.Execute.encode(message.execute, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.result != null && Object.hasOwnProperty.call(message, "result"))
                $root.relay.Result.encode(message.result, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.error != null && Object.hasOwnProperty.call(message, "error"))
                $root.relay.Error.encode(message.error, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            if (message.ping != null && Object.hasOwnProperty.call(message, "ping"))
                $root.relay.Ping.encode(message.ping, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
            if (message.pong != null && Object.hasOwnProperty.call(message, "pong"))
                $root.relay.Pong.encode(message.pong, writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified Message message, length delimited. Does not implicitly {@link relay.Message.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.Message
         * @static
         * @param {relay.IMessage} message Message message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Message.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Message message from the specified reader or buffer.
         * @function decode
         * @memberof relay.Message
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.Message} Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Message.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.Message();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.toolCall = $root.relay.ToolCall.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.toolResult = $root.relay.ToolResult.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.execute = $root.relay.Execute.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.result = $root.relay.Result.decode(reader, reader.uint32());
                        break;
                    }
                case 5: {
                        message.error = $root.relay.Error.decode(reader, reader.uint32());
                        break;
                    }
                case 6: {
                        message.ping = $root.relay.Ping.decode(reader, reader.uint32());
                        break;
                    }
                case 7: {
                        message.pong = $root.relay.Pong.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Message message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.Message
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.Message} Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Message.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Message message.
         * @function verify
         * @memberof relay.Message
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Message.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            let properties = {};
            if (message.toolCall != null && message.hasOwnProperty("toolCall")) {
                properties.payload = 1;
                {
                    let error = $root.relay.ToolCall.verify(message.toolCall);
                    if (error)
                        return "toolCall." + error;
                }
            }
            if (message.toolResult != null && message.hasOwnProperty("toolResult")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.relay.ToolResult.verify(message.toolResult);
                    if (error)
                        return "toolResult." + error;
                }
            }
            if (message.execute != null && message.hasOwnProperty("execute")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.relay.Execute.verify(message.execute);
                    if (error)
                        return "execute." + error;
                }
            }
            if (message.result != null && message.hasOwnProperty("result")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.relay.Result.verify(message.result);
                    if (error)
                        return "result." + error;
                }
            }
            if (message.error != null && message.hasOwnProperty("error")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.relay.Error.verify(message.error);
                    if (error)
                        return "error." + error;
                }
            }
            if (message.ping != null && message.hasOwnProperty("ping")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.relay.Ping.verify(message.ping);
                    if (error)
                        return "ping." + error;
                }
            }
            if (message.pong != null && message.hasOwnProperty("pong")) {
                if (properties.payload === 1)
                    return "payload: multiple values";
                properties.payload = 1;
                {
                    let error = $root.relay.Pong.verify(message.pong);
                    if (error)
                        return "pong." + error;
                }
            }
            return null;
        };

        /**
         * Creates a Message message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.Message
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.Message} Message
         */
        Message.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.Message)
                return object;
            let message = new $root.relay.Message();
            if (object.toolCall != null) {
                if (typeof object.toolCall !== "object")
                    throw TypeError(".relay.Message.toolCall: object expected");
                message.toolCall = $root.relay.ToolCall.fromObject(object.toolCall);
            }
            if (object.toolResult != null) {
                if (typeof object.toolResult !== "object")
                    throw TypeError(".relay.Message.toolResult: object expected");
                message.toolResult = $root.relay.ToolResult.fromObject(object.toolResult);
            }
            if (object.execute != null) {
                if (typeof object.execute !== "object")
                    throw TypeError(".relay.Message.execute: object expected");
                message.execute = $root.relay.Execute.fromObject(object.execute);
            }
            if (object.result != null) {
                if (typeof object.result !== "object")
                    throw TypeError(".relay.Message.result: object expected");
                message.result = $root.relay.Result.fromObject(object.result);
            }
            if (object.error != null) {
                if (typeof object.error !== "object")
                    throw TypeError(".relay.Message.error: object expected");
                message.error = $root.relay.Error.fromObject(object.error);
            }
            if (object.ping != null) {
                if (typeof object.ping !== "object")
                    throw TypeError(".relay.Message.ping: object expected");
                message.ping = $root.relay.Ping.fromObject(object.ping);
            }
            if (object.pong != null) {
                if (typeof object.pong !== "object")
                    throw TypeError(".relay.Message.pong: object expected");
                message.pong = $root.relay.Pong.fromObject(object.pong);
            }
            return message;
        };

        /**
         * Creates a plain object from a Message message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.Message
         * @static
         * @param {relay.Message} message Message
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Message.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (message.toolCall != null && message.hasOwnProperty("toolCall")) {
                object.toolCall = $root.relay.ToolCall.toObject(message.toolCall, options);
                if (options.oneofs)
                    object.payload = "toolCall";
            }
            if (message.toolResult != null && message.hasOwnProperty("toolResult")) {
                object.toolResult = $root.relay.ToolResult.toObject(message.toolResult, options);
                if (options.oneofs)
                    object.payload = "toolResult";
            }
            if (message.execute != null && message.hasOwnProperty("execute")) {
                object.execute = $root.relay.Execute.toObject(message.execute, options);
                if (options.oneofs)
                    object.payload = "execute";
            }
            if (message.result != null && message.hasOwnProperty("result")) {
                object.result = $root.relay.Result.toObject(message.result, options);
                if (options.oneofs)
                    object.payload = "result";
            }
            if (message.error != null && message.hasOwnProperty("error")) {
                object.error = $root.relay.Error.toObject(message.error, options);
                if (options.oneofs)
                    object.payload = "error";
            }
            if (message.ping != null && message.hasOwnProperty("ping")) {
                object.ping = $root.relay.Ping.toObject(message.ping, options);
                if (options.oneofs)
                    object.payload = "ping";
            }
            if (message.pong != null && message.hasOwnProperty("pong")) {
                object.pong = $root.relay.Pong.toObject(message.pong, options);
                if (options.oneofs)
                    object.payload = "pong";
            }
            return object;
        };

        /**
         * Converts this Message to JSON.
         * @function toJSON
         * @memberof relay.Message
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Message.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Message
         * @function getTypeUrl
         * @memberof relay.Message
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Message.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.Message";
        };

        return Message;
    })();

    relay.ToolCall = (function() {

        /**
         * Properties of a ToolCall.
         * @memberof relay
         * @interface IToolCall
         * @property {string|null} [id] ToolCall id
         * @property {string|null} [tool] ToolCall tool
         * @property {Uint8Array|null} ["arguments"] ToolCall arguments
         */

        /**
         * Constructs a new ToolCall.
         * @memberof relay
         * @classdesc Represents a ToolCall.
         * @implements IToolCall
         * @constructor
         * @param {relay.IToolCall=} [properties] Properties to set
         */
        function ToolCall(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ToolCall id.
         * @member {string} id
         * @memberof relay.ToolCall
         * @instance
         */
        ToolCall.prototype.id = "";

        /**
         * ToolCall tool.
         * @member {string} tool
         * @memberof relay.ToolCall
         * @instance
         */
        ToolCall.prototype.tool = "";

        /**
         * ToolCall arguments.
         * @member {Uint8Array} arguments
         * @memberof relay.ToolCall
         * @instance
         */
        ToolCall.prototype["arguments"] = $util.newBuffer([]);

        /**
         * Creates a new ToolCall instance using the specified properties.
         * @function create
         * @memberof relay.ToolCall
         * @static
         * @param {relay.IToolCall=} [properties] Properties to set
         * @returns {relay.ToolCall} ToolCall instance
         */
        ToolCall.create = function create(properties) {
            return new ToolCall(properties);
        };

        /**
         * Encodes the specified ToolCall message. Does not implicitly {@link relay.ToolCall.verify|verify} messages.
         * @function encode
         * @memberof relay.ToolCall
         * @static
         * @param {relay.IToolCall} message ToolCall message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ToolCall.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
            if (message.tool != null && Object.hasOwnProperty.call(message, "tool"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.tool);
            if (message["arguments"] != null && Object.hasOwnProperty.call(message, "arguments"))
                writer.uint32(/* id 3, wireType 2 =*/26).bytes(message["arguments"]);
            return writer;
        };

        /**
         * Encodes the specified ToolCall message, length delimited. Does not implicitly {@link relay.ToolCall.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.ToolCall
         * @static
         * @param {relay.IToolCall} message ToolCall message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ToolCall.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ToolCall message from the specified reader or buffer.
         * @function decode
         * @memberof relay.ToolCall
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.ToolCall} ToolCall
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ToolCall.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.ToolCall();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.string();
                        break;
                    }
                case 2: {
                        message.tool = reader.string();
                        break;
                    }
                case 3: {
                        message["arguments"] = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ToolCall message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.ToolCall
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.ToolCall} ToolCall
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ToolCall.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ToolCall message.
         * @function verify
         * @memberof relay.ToolCall
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ToolCall.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            if (message.tool != null && message.hasOwnProperty("tool"))
                if (!$util.isString(message.tool))
                    return "tool: string expected";
            if (message["arguments"] != null && message.hasOwnProperty("arguments"))
                if (!(message["arguments"] && typeof message["arguments"].length === "number" || $util.isString(message["arguments"])))
                    return "arguments: buffer expected";
            return null;
        };

        /**
         * Creates a ToolCall message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.ToolCall
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.ToolCall} ToolCall
         */
        ToolCall.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.ToolCall)
                return object;
            let message = new $root.relay.ToolCall();
            if (object.id != null)
                message.id = String(object.id);
            if (object.tool != null)
                message.tool = String(object.tool);
            if (object["arguments"] != null)
                if (typeof object["arguments"] === "string")
                    $util.base64.decode(object["arguments"], message["arguments"] = $util.newBuffer($util.base64.length(object["arguments"])), 0);
                else if (object["arguments"].length >= 0)
                    message["arguments"] = object["arguments"];
            return message;
        };

        /**
         * Creates a plain object from a ToolCall message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.ToolCall
         * @static
         * @param {relay.ToolCall} message ToolCall
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ToolCall.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.id = "";
                object.tool = "";
                if (options.bytes === String)
                    object["arguments"] = "";
                else {
                    object["arguments"] = [];
                    if (options.bytes !== Array)
                        object["arguments"] = $util.newBuffer(object["arguments"]);
                }
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.tool != null && message.hasOwnProperty("tool"))
                object.tool = message.tool;
            if (message["arguments"] != null && message.hasOwnProperty("arguments"))
                object["arguments"] = options.bytes === String ? $util.base64.encode(message["arguments"], 0, message["arguments"].length) : options.bytes === Array ? Array.prototype.slice.call(message["arguments"]) : message["arguments"];
            return object;
        };

        /**
         * Converts this ToolCall to JSON.
         * @function toJSON
         * @memberof relay.ToolCall
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ToolCall.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ToolCall
         * @function getTypeUrl
         * @memberof relay.ToolCall
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ToolCall.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.ToolCall";
        };

        return ToolCall;
    })();

    relay.ToolResult = (function() {

        /**
         * Properties of a ToolResult.
         * @memberof relay
         * @interface IToolResult
         * @property {string|null} [id] ToolResult id
         * @property {boolean|null} [success] ToolResult success
         * @property {Uint8Array|null} [result] ToolResult result
         * @property {string|null} [error] ToolResult error
         */

        /**
         * Constructs a new ToolResult.
         * @memberof relay
         * @classdesc Represents a ToolResult.
         * @implements IToolResult
         * @constructor
         * @param {relay.IToolResult=} [properties] Properties to set
         */
        function ToolResult(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ToolResult id.
         * @member {string} id
         * @memberof relay.ToolResult
         * @instance
         */
        ToolResult.prototype.id = "";

        /**
         * ToolResult success.
         * @member {boolean} success
         * @memberof relay.ToolResult
         * @instance
         */
        ToolResult.prototype.success = false;

        /**
         * ToolResult result.
         * @member {Uint8Array} result
         * @memberof relay.ToolResult
         * @instance
         */
        ToolResult.prototype.result = $util.newBuffer([]);

        /**
         * ToolResult error.
         * @member {string} error
         * @memberof relay.ToolResult
         * @instance
         */
        ToolResult.prototype.error = "";

        /**
         * Creates a new ToolResult instance using the specified properties.
         * @function create
         * @memberof relay.ToolResult
         * @static
         * @param {relay.IToolResult=} [properties] Properties to set
         * @returns {relay.ToolResult} ToolResult instance
         */
        ToolResult.create = function create(properties) {
            return new ToolResult(properties);
        };

        /**
         * Encodes the specified ToolResult message. Does not implicitly {@link relay.ToolResult.verify|verify} messages.
         * @function encode
         * @memberof relay.ToolResult
         * @static
         * @param {relay.IToolResult} message ToolResult message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ToolResult.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
            if (message.success != null && Object.hasOwnProperty.call(message, "success"))
                writer.uint32(/* id 2, wireType 0 =*/16).bool(message.success);
            if (message.result != null && Object.hasOwnProperty.call(message, "result"))
                writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.result);
            if (message.error != null && Object.hasOwnProperty.call(message, "error"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.error);
            return writer;
        };

        /**
         * Encodes the specified ToolResult message, length delimited. Does not implicitly {@link relay.ToolResult.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.ToolResult
         * @static
         * @param {relay.IToolResult} message ToolResult message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ToolResult.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ToolResult message from the specified reader or buffer.
         * @function decode
         * @memberof relay.ToolResult
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.ToolResult} ToolResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ToolResult.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.ToolResult();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.string();
                        break;
                    }
                case 2: {
                        message.success = reader.bool();
                        break;
                    }
                case 3: {
                        message.result = reader.bytes();
                        break;
                    }
                case 4: {
                        message.error = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ToolResult message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.ToolResult
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.ToolResult} ToolResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ToolResult.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ToolResult message.
         * @function verify
         * @memberof relay.ToolResult
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ToolResult.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            if (message.success != null && message.hasOwnProperty("success"))
                if (typeof message.success !== "boolean")
                    return "success: boolean expected";
            if (message.result != null && message.hasOwnProperty("result"))
                if (!(message.result && typeof message.result.length === "number" || $util.isString(message.result)))
                    return "result: buffer expected";
            if (message.error != null && message.hasOwnProperty("error"))
                if (!$util.isString(message.error))
                    return "error: string expected";
            return null;
        };

        /**
         * Creates a ToolResult message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.ToolResult
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.ToolResult} ToolResult
         */
        ToolResult.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.ToolResult)
                return object;
            let message = new $root.relay.ToolResult();
            if (object.id != null)
                message.id = String(object.id);
            if (object.success != null)
                message.success = Boolean(object.success);
            if (object.result != null)
                if (typeof object.result === "string")
                    $util.base64.decode(object.result, message.result = $util.newBuffer($util.base64.length(object.result)), 0);
                else if (object.result.length >= 0)
                    message.result = object.result;
            if (object.error != null)
                message.error = String(object.error);
            return message;
        };

        /**
         * Creates a plain object from a ToolResult message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.ToolResult
         * @static
         * @param {relay.ToolResult} message ToolResult
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ToolResult.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.id = "";
                object.success = false;
                if (options.bytes === String)
                    object.result = "";
                else {
                    object.result = [];
                    if (options.bytes !== Array)
                        object.result = $util.newBuffer(object.result);
                }
                object.error = "";
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.success != null && message.hasOwnProperty("success"))
                object.success = message.success;
            if (message.result != null && message.hasOwnProperty("result"))
                object.result = options.bytes === String ? $util.base64.encode(message.result, 0, message.result.length) : options.bytes === Array ? Array.prototype.slice.call(message.result) : message.result;
            if (message.error != null && message.hasOwnProperty("error"))
                object.error = message.error;
            return object;
        };

        /**
         * Converts this ToolResult to JSON.
         * @function toJSON
         * @memberof relay.ToolResult
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ToolResult.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ToolResult
         * @function getTypeUrl
         * @memberof relay.ToolResult
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ToolResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.ToolResult";
        };

        return ToolResult;
    })();

    relay.Execute = (function() {

        /**
         * Properties of an Execute.
         * @memberof relay
         * @interface IExecute
         * @property {string|null} [code] Execute code
         * @property {Array.<string>|null} [remoteTools] Execute remoteTools
         * @property {Object.<string,string>|null} [localTools] Execute localTools
         */

        /**
         * Constructs a new Execute.
         * @memberof relay
         * @classdesc Represents an Execute.
         * @implements IExecute
         * @constructor
         * @param {relay.IExecute=} [properties] Properties to set
         */
        function Execute(properties) {
            this.remoteTools = [];
            this.localTools = {};
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Execute code.
         * @member {string} code
         * @memberof relay.Execute
         * @instance
         */
        Execute.prototype.code = "";

        /**
         * Execute remoteTools.
         * @member {Array.<string>} remoteTools
         * @memberof relay.Execute
         * @instance
         */
        Execute.prototype.remoteTools = $util.emptyArray;

        /**
         * Execute localTools.
         * @member {Object.<string,string>} localTools
         * @memberof relay.Execute
         * @instance
         */
        Execute.prototype.localTools = $util.emptyObject;

        /**
         * Creates a new Execute instance using the specified properties.
         * @function create
         * @memberof relay.Execute
         * @static
         * @param {relay.IExecute=} [properties] Properties to set
         * @returns {relay.Execute} Execute instance
         */
        Execute.create = function create(properties) {
            return new Execute(properties);
        };

        /**
         * Encodes the specified Execute message. Does not implicitly {@link relay.Execute.verify|verify} messages.
         * @function encode
         * @memberof relay.Execute
         * @static
         * @param {relay.IExecute} message Execute message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Execute.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.code);
            if (message.remoteTools != null && message.remoteTools.length)
                for (let i = 0; i < message.remoteTools.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.remoteTools[i]);
            if (message.localTools != null && Object.hasOwnProperty.call(message, "localTools"))
                for (let keys = Object.keys(message.localTools), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 3, wireType 2 =*/26).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).string(message.localTools[keys[i]]).ldelim();
            return writer;
        };

        /**
         * Encodes the specified Execute message, length delimited. Does not implicitly {@link relay.Execute.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.Execute
         * @static
         * @param {relay.IExecute} message Execute message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Execute.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an Execute message from the specified reader or buffer.
         * @function decode
         * @memberof relay.Execute
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.Execute} Execute
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Execute.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.Execute(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.code = reader.string();
                        break;
                    }
                case 2: {
                        if (!(message.remoteTools && message.remoteTools.length))
                            message.remoteTools = [];
                        message.remoteTools.push(reader.string());
                        break;
                    }
                case 3: {
                        if (message.localTools === $util.emptyObject)
                            message.localTools = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = "";
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.string();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.localTools[key] = value;
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an Execute message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.Execute
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.Execute} Execute
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Execute.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an Execute message.
         * @function verify
         * @memberof relay.Execute
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Execute.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.code != null && message.hasOwnProperty("code"))
                if (!$util.isString(message.code))
                    return "code: string expected";
            if (message.remoteTools != null && message.hasOwnProperty("remoteTools")) {
                if (!Array.isArray(message.remoteTools))
                    return "remoteTools: array expected";
                for (let i = 0; i < message.remoteTools.length; ++i)
                    if (!$util.isString(message.remoteTools[i]))
                        return "remoteTools: string[] expected";
            }
            if (message.localTools != null && message.hasOwnProperty("localTools")) {
                if (!$util.isObject(message.localTools))
                    return "localTools: object expected";
                let key = Object.keys(message.localTools);
                for (let i = 0; i < key.length; ++i)
                    if (!$util.isString(message.localTools[key[i]]))
                        return "localTools: string{k:string} expected";
            }
            return null;
        };

        /**
         * Creates an Execute message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.Execute
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.Execute} Execute
         */
        Execute.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.Execute)
                return object;
            let message = new $root.relay.Execute();
            if (object.code != null)
                message.code = String(object.code);
            if (object.remoteTools) {
                if (!Array.isArray(object.remoteTools))
                    throw TypeError(".relay.Execute.remoteTools: array expected");
                message.remoteTools = [];
                for (let i = 0; i < object.remoteTools.length; ++i)
                    message.remoteTools[i] = String(object.remoteTools[i]);
            }
            if (object.localTools) {
                if (typeof object.localTools !== "object")
                    throw TypeError(".relay.Execute.localTools: object expected");
                message.localTools = {};
                for (let keys = Object.keys(object.localTools), i = 0; i < keys.length; ++i)
                    message.localTools[keys[i]] = String(object.localTools[keys[i]]);
            }
            return message;
        };

        /**
         * Creates a plain object from an Execute message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.Execute
         * @static
         * @param {relay.Execute} message Execute
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Execute.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.remoteTools = [];
            if (options.objects || options.defaults)
                object.localTools = {};
            if (options.defaults)
                object.code = "";
            if (message.code != null && message.hasOwnProperty("code"))
                object.code = message.code;
            if (message.remoteTools && message.remoteTools.length) {
                object.remoteTools = [];
                for (let j = 0; j < message.remoteTools.length; ++j)
                    object.remoteTools[j] = message.remoteTools[j];
            }
            let keys2;
            if (message.localTools && (keys2 = Object.keys(message.localTools)).length) {
                object.localTools = {};
                for (let j = 0; j < keys2.length; ++j)
                    object.localTools[keys2[j]] = message.localTools[keys2[j]];
            }
            return object;
        };

        /**
         * Converts this Execute to JSON.
         * @function toJSON
         * @memberof relay.Execute
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Execute.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Execute
         * @function getTypeUrl
         * @memberof relay.Execute
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Execute.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.Execute";
        };

        return Execute;
    })();

    relay.Result = (function() {

        /**
         * Properties of a Result.
         * @memberof relay
         * @interface IResult
         * @property {Uint8Array|null} [data] Result data
         */

        /**
         * Constructs a new Result.
         * @memberof relay
         * @classdesc Represents a Result.
         * @implements IResult
         * @constructor
         * @param {relay.IResult=} [properties] Properties to set
         */
        function Result(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Result data.
         * @member {Uint8Array} data
         * @memberof relay.Result
         * @instance
         */
        Result.prototype.data = $util.newBuffer([]);

        /**
         * Creates a new Result instance using the specified properties.
         * @function create
         * @memberof relay.Result
         * @static
         * @param {relay.IResult=} [properties] Properties to set
         * @returns {relay.Result} Result instance
         */
        Result.create = function create(properties) {
            return new Result(properties);
        };

        /**
         * Encodes the specified Result message. Does not implicitly {@link relay.Result.verify|verify} messages.
         * @function encode
         * @memberof relay.Result
         * @static
         * @param {relay.IResult} message Result message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Result.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.data);
            return writer;
        };

        /**
         * Encodes the specified Result message, length delimited. Does not implicitly {@link relay.Result.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.Result
         * @static
         * @param {relay.IResult} message Result message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Result.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Result message from the specified reader or buffer.
         * @function decode
         * @memberof relay.Result
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.Result} Result
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Result.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.Result();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.data = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Result message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.Result
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.Result} Result
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Result.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Result message.
         * @function verify
         * @memberof relay.Result
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Result.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.data != null && message.hasOwnProperty("data"))
                if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                    return "data: buffer expected";
            return null;
        };

        /**
         * Creates a Result message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.Result
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.Result} Result
         */
        Result.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.Result)
                return object;
            let message = new $root.relay.Result();
            if (object.data != null)
                if (typeof object.data === "string")
                    $util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);
                else if (object.data.length >= 0)
                    message.data = object.data;
            return message;
        };

        /**
         * Creates a plain object from a Result message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.Result
         * @static
         * @param {relay.Result} message Result
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Result.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                if (options.bytes === String)
                    object.data = "";
                else {
                    object.data = [];
                    if (options.bytes !== Array)
                        object.data = $util.newBuffer(object.data);
                }
            if (message.data != null && message.hasOwnProperty("data"))
                object.data = options.bytes === String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === Array ? Array.prototype.slice.call(message.data) : message.data;
            return object;
        };

        /**
         * Converts this Result to JSON.
         * @function toJSON
         * @memberof relay.Result
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Result.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Result
         * @function getTypeUrl
         * @memberof relay.Result
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Result.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.Result";
        };

        return Result;
    })();

    relay.Error = (function() {

        /**
         * Properties of an Error.
         * @memberof relay
         * @interface IError
         * @property {string|null} [id] Error id
         * @property {string|null} [error] Error error
         * @property {string|null} [code] Error code
         */

        /**
         * Constructs a new Error.
         * @memberof relay
         * @classdesc Represents an Error.
         * @implements IError
         * @constructor
         * @param {relay.IError=} [properties] Properties to set
         */
        function Error(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Error id.
         * @member {string} id
         * @memberof relay.Error
         * @instance
         */
        Error.prototype.id = "";

        /**
         * Error error.
         * @member {string} error
         * @memberof relay.Error
         * @instance
         */
        Error.prototype.error = "";

        /**
         * Error code.
         * @member {string} code
         * @memberof relay.Error
         * @instance
         */
        Error.prototype.code = "";

        /**
         * Creates a new Error instance using the specified properties.
         * @function create
         * @memberof relay.Error
         * @static
         * @param {relay.IError=} [properties] Properties to set
         * @returns {relay.Error} Error instance
         */
        Error.create = function create(properties) {
            return new Error(properties);
        };

        /**
         * Encodes the specified Error message. Does not implicitly {@link relay.Error.verify|verify} messages.
         * @function encode
         * @memberof relay.Error
         * @static
         * @param {relay.IError} message Error message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Error.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
            if (message.error != null && Object.hasOwnProperty.call(message, "error"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.error);
            if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.code);
            return writer;
        };

        /**
         * Encodes the specified Error message, length delimited. Does not implicitly {@link relay.Error.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.Error
         * @static
         * @param {relay.IError} message Error message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Error.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an Error message from the specified reader or buffer.
         * @function decode
         * @memberof relay.Error
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.Error} Error
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Error.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.Error();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.string();
                        break;
                    }
                case 2: {
                        message.error = reader.string();
                        break;
                    }
                case 3: {
                        message.code = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an Error message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.Error
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.Error} Error
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Error.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an Error message.
         * @function verify
         * @memberof relay.Error
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Error.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            if (message.error != null && message.hasOwnProperty("error"))
                if (!$util.isString(message.error))
                    return "error: string expected";
            if (message.code != null && message.hasOwnProperty("code"))
                if (!$util.isString(message.code))
                    return "code: string expected";
            return null;
        };

        /**
         * Creates an Error message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.Error
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.Error} Error
         */
        Error.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.Error)
                return object;
            let message = new $root.relay.Error();
            if (object.id != null)
                message.id = String(object.id);
            if (object.error != null)
                message.error = String(object.error);
            if (object.code != null)
                message.code = String(object.code);
            return message;
        };

        /**
         * Creates a plain object from an Error message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.Error
         * @static
         * @param {relay.Error} message Error
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Error.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.id = "";
                object.error = "";
                object.code = "";
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.error != null && message.hasOwnProperty("error"))
                object.error = message.error;
            if (message.code != null && message.hasOwnProperty("code"))
                object.code = message.code;
            return object;
        };

        /**
         * Converts this Error to JSON.
         * @function toJSON
         * @memberof relay.Error
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Error.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Error
         * @function getTypeUrl
         * @memberof relay.Error
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Error.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.Error";
        };

        return Error;
    })();

    relay.Ping = (function() {

        /**
         * Properties of a Ping.
         * @memberof relay
         * @interface IPing
         * @property {string|null} [id] Ping id
         */

        /**
         * Constructs a new Ping.
         * @memberof relay
         * @classdesc Represents a Ping.
         * @implements IPing
         * @constructor
         * @param {relay.IPing=} [properties] Properties to set
         */
        function Ping(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Ping id.
         * @member {string} id
         * @memberof relay.Ping
         * @instance
         */
        Ping.prototype.id = "";

        /**
         * Creates a new Ping instance using the specified properties.
         * @function create
         * @memberof relay.Ping
         * @static
         * @param {relay.IPing=} [properties] Properties to set
         * @returns {relay.Ping} Ping instance
         */
        Ping.create = function create(properties) {
            return new Ping(properties);
        };

        /**
         * Encodes the specified Ping message. Does not implicitly {@link relay.Ping.verify|verify} messages.
         * @function encode
         * @memberof relay.Ping
         * @static
         * @param {relay.IPing} message Ping message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Ping.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
            return writer;
        };

        /**
         * Encodes the specified Ping message, length delimited. Does not implicitly {@link relay.Ping.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.Ping
         * @static
         * @param {relay.IPing} message Ping message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Ping.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Ping message from the specified reader or buffer.
         * @function decode
         * @memberof relay.Ping
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.Ping} Ping
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Ping.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.Ping();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Ping message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.Ping
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.Ping} Ping
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Ping.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Ping message.
         * @function verify
         * @memberof relay.Ping
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Ping.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            return null;
        };

        /**
         * Creates a Ping message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.Ping
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.Ping} Ping
         */
        Ping.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.Ping)
                return object;
            let message = new $root.relay.Ping();
            if (object.id != null)
                message.id = String(object.id);
            return message;
        };

        /**
         * Creates a plain object from a Ping message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.Ping
         * @static
         * @param {relay.Ping} message Ping
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Ping.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.id = "";
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            return object;
        };

        /**
         * Converts this Ping to JSON.
         * @function toJSON
         * @memberof relay.Ping
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Ping.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Ping
         * @function getTypeUrl
         * @memberof relay.Ping
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Ping.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.Ping";
        };

        return Ping;
    })();

    relay.Pong = (function() {

        /**
         * Properties of a Pong.
         * @memberof relay
         * @interface IPong
         * @property {string|null} [id] Pong id
         */

        /**
         * Constructs a new Pong.
         * @memberof relay
         * @classdesc Represents a Pong.
         * @implements IPong
         * @constructor
         * @param {relay.IPong=} [properties] Properties to set
         */
        function Pong(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Pong id.
         * @member {string} id
         * @memberof relay.Pong
         * @instance
         */
        Pong.prototype.id = "";

        /**
         * Creates a new Pong instance using the specified properties.
         * @function create
         * @memberof relay.Pong
         * @static
         * @param {relay.IPong=} [properties] Properties to set
         * @returns {relay.Pong} Pong instance
         */
        Pong.create = function create(properties) {
            return new Pong(properties);
        };

        /**
         * Encodes the specified Pong message. Does not implicitly {@link relay.Pong.verify|verify} messages.
         * @function encode
         * @memberof relay.Pong
         * @static
         * @param {relay.IPong} message Pong message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Pong.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
            return writer;
        };

        /**
         * Encodes the specified Pong message, length delimited. Does not implicitly {@link relay.Pong.verify|verify} messages.
         * @function encodeDelimited
         * @memberof relay.Pong
         * @static
         * @param {relay.IPong} message Pong message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Pong.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Pong message from the specified reader or buffer.
         * @function decode
         * @memberof relay.Pong
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {relay.Pong} Pong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Pong.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.relay.Pong();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Pong message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof relay.Pong
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {relay.Pong} Pong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Pong.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Pong message.
         * @function verify
         * @memberof relay.Pong
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Pong.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            return null;
        };

        /**
         * Creates a Pong message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof relay.Pong
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {relay.Pong} Pong
         */
        Pong.fromObject = function fromObject(object) {
            if (object instanceof $root.relay.Pong)
                return object;
            let message = new $root.relay.Pong();
            if (object.id != null)
                message.id = String(object.id);
            return message;
        };

        /**
         * Creates a plain object from a Pong message. Also converts values to other types if specified.
         * @function toObject
         * @memberof relay.Pong
         * @static
         * @param {relay.Pong} message Pong
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Pong.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.id = "";
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            return object;
        };

        /**
         * Converts this Pong to JSON.
         * @function toJSON
         * @memberof relay.Pong
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Pong.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Pong
         * @function getTypeUrl
         * @memberof relay.Pong
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Pong.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/relay.Pong";
        };

        return Pong;
    })();

    return relay;
})();

export { $root as default };
