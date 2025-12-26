import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace relay. */
export namespace relay {

    /** Properties of a Message. */
    interface IMessage {

        /** Message toolCall */
        toolCall?: (relay.IToolCall|null);

        /** Message toolResult */
        toolResult?: (relay.IToolResult|null);

        /** Message execute */
        execute?: (relay.IExecute|null);

        /** Message result */
        result?: (relay.IResult|null);

        /** Message error */
        error?: (relay.IError|null);

        /** Message ping */
        ping?: (relay.IPing|null);

        /** Message pong */
        pong?: (relay.IPong|null);
    }

    /** Represents a Message. */
    class Message implements IMessage {

        /**
         * Constructs a new Message.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IMessage);

        /** Message toolCall. */
        public toolCall?: (relay.IToolCall|null);

        /** Message toolResult. */
        public toolResult?: (relay.IToolResult|null);

        /** Message execute. */
        public execute?: (relay.IExecute|null);

        /** Message result. */
        public result?: (relay.IResult|null);

        /** Message error. */
        public error?: (relay.IError|null);

        /** Message ping. */
        public ping?: (relay.IPing|null);

        /** Message pong. */
        public pong?: (relay.IPong|null);

        /** Message payload. */
        public payload?: ("toolCall"|"toolResult"|"execute"|"result"|"error"|"ping"|"pong");

        /**
         * Creates a new Message instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Message instance
         */
        public static create(properties?: relay.IMessage): relay.Message;

        /**
         * Encodes the specified Message message. Does not implicitly {@link relay.Message.verify|verify} messages.
         * @param message Message message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Message message, length delimited. Does not implicitly {@link relay.Message.verify|verify} messages.
         * @param message Message message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Message message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.Message;

        /**
         * Decodes a Message message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Message
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.Message;

        /**
         * Verifies a Message message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Message message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Message
         */
        public static fromObject(object: { [k: string]: any }): relay.Message;

        /**
         * Creates a plain object from a Message message. Also converts values to other types if specified.
         * @param message Message
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.Message, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Message to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Message
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ToolCall. */
    interface IToolCall {

        /** ToolCall id */
        id?: (string|null);

        /** ToolCall tool */
        tool?: (string|null);

        /** ToolCall arguments */
        "arguments"?: (Uint8Array|null);
    }

    /** Represents a ToolCall. */
    class ToolCall implements IToolCall {

        /**
         * Constructs a new ToolCall.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IToolCall);

        /** ToolCall id. */
        public id: string;

        /** ToolCall tool. */
        public tool: string;

        /** ToolCall arguments. */
        public arguments: Uint8Array;

        /**
         * Creates a new ToolCall instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ToolCall instance
         */
        public static create(properties?: relay.IToolCall): relay.ToolCall;

        /**
         * Encodes the specified ToolCall message. Does not implicitly {@link relay.ToolCall.verify|verify} messages.
         * @param message ToolCall message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IToolCall, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ToolCall message, length delimited. Does not implicitly {@link relay.ToolCall.verify|verify} messages.
         * @param message ToolCall message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IToolCall, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ToolCall message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ToolCall
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.ToolCall;

        /**
         * Decodes a ToolCall message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ToolCall
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.ToolCall;

        /**
         * Verifies a ToolCall message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ToolCall message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ToolCall
         */
        public static fromObject(object: { [k: string]: any }): relay.ToolCall;

        /**
         * Creates a plain object from a ToolCall message. Also converts values to other types if specified.
         * @param message ToolCall
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.ToolCall, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ToolCall to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ToolCall
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ToolResult. */
    interface IToolResult {

        /** ToolResult id */
        id?: (string|null);

        /** ToolResult success */
        success?: (boolean|null);

        /** ToolResult result */
        result?: (Uint8Array|null);

        /** ToolResult error */
        error?: (string|null);
    }

    /** Represents a ToolResult. */
    class ToolResult implements IToolResult {

        /**
         * Constructs a new ToolResult.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IToolResult);

        /** ToolResult id. */
        public id: string;

        /** ToolResult success. */
        public success: boolean;

        /** ToolResult result. */
        public result: Uint8Array;

        /** ToolResult error. */
        public error: string;

        /**
         * Creates a new ToolResult instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ToolResult instance
         */
        public static create(properties?: relay.IToolResult): relay.ToolResult;

        /**
         * Encodes the specified ToolResult message. Does not implicitly {@link relay.ToolResult.verify|verify} messages.
         * @param message ToolResult message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IToolResult, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ToolResult message, length delimited. Does not implicitly {@link relay.ToolResult.verify|verify} messages.
         * @param message ToolResult message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IToolResult, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ToolResult message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ToolResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.ToolResult;

        /**
         * Decodes a ToolResult message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ToolResult
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.ToolResult;

        /**
         * Verifies a ToolResult message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ToolResult message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ToolResult
         */
        public static fromObject(object: { [k: string]: any }): relay.ToolResult;

        /**
         * Creates a plain object from a ToolResult message. Also converts values to other types if specified.
         * @param message ToolResult
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.ToolResult, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ToolResult to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ToolResult
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an Execute. */
    interface IExecute {

        /** Execute code */
        code?: (string|null);

        /** Execute remoteTools */
        remoteTools?: (string[]|null);

        /** Execute localTools */
        localTools?: ({ [k: string]: string }|null);
    }

    /** Represents an Execute. */
    class Execute implements IExecute {

        /**
         * Constructs a new Execute.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IExecute);

        /** Execute code. */
        public code: string;

        /** Execute remoteTools. */
        public remoteTools: string[];

        /** Execute localTools. */
        public localTools: { [k: string]: string };

        /**
         * Creates a new Execute instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Execute instance
         */
        public static create(properties?: relay.IExecute): relay.Execute;

        /**
         * Encodes the specified Execute message. Does not implicitly {@link relay.Execute.verify|verify} messages.
         * @param message Execute message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IExecute, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Execute message, length delimited. Does not implicitly {@link relay.Execute.verify|verify} messages.
         * @param message Execute message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IExecute, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an Execute message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Execute
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.Execute;

        /**
         * Decodes an Execute message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Execute
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.Execute;

        /**
         * Verifies an Execute message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an Execute message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Execute
         */
        public static fromObject(object: { [k: string]: any }): relay.Execute;

        /**
         * Creates a plain object from an Execute message. Also converts values to other types if specified.
         * @param message Execute
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.Execute, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Execute to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Execute
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Result. */
    interface IResult {

        /** Result data */
        data?: (Uint8Array|null);
    }

    /** Represents a Result. */
    class Result implements IResult {

        /**
         * Constructs a new Result.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IResult);

        /** Result data. */
        public data: Uint8Array;

        /**
         * Creates a new Result instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Result instance
         */
        public static create(properties?: relay.IResult): relay.Result;

        /**
         * Encodes the specified Result message. Does not implicitly {@link relay.Result.verify|verify} messages.
         * @param message Result message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IResult, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Result message, length delimited. Does not implicitly {@link relay.Result.verify|verify} messages.
         * @param message Result message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IResult, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Result message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Result
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.Result;

        /**
         * Decodes a Result message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Result
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.Result;

        /**
         * Verifies a Result message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Result message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Result
         */
        public static fromObject(object: { [k: string]: any }): relay.Result;

        /**
         * Creates a plain object from a Result message. Also converts values to other types if specified.
         * @param message Result
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.Result, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Result to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Result
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an Error. */
    interface IError {

        /** Error id */
        id?: (string|null);

        /** Error error */
        error?: (string|null);

        /** Error code */
        code?: (string|null);
    }

    /** Represents an Error. */
    class Error implements IError {

        /**
         * Constructs a new Error.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IError);

        /** Error id. */
        public id: string;

        /** Error error. */
        public error: string;

        /** Error code. */
        public code: string;

        /**
         * Creates a new Error instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Error instance
         */
        public static create(properties?: relay.IError): relay.Error;

        /**
         * Encodes the specified Error message. Does not implicitly {@link relay.Error.verify|verify} messages.
         * @param message Error message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IError, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Error message, length delimited. Does not implicitly {@link relay.Error.verify|verify} messages.
         * @param message Error message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IError, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an Error message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Error
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.Error;

        /**
         * Decodes an Error message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Error
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.Error;

        /**
         * Verifies an Error message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an Error message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Error
         */
        public static fromObject(object: { [k: string]: any }): relay.Error;

        /**
         * Creates a plain object from an Error message. Also converts values to other types if specified.
         * @param message Error
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.Error, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Error to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Error
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Ping. */
    interface IPing {

        /** Ping id */
        id?: (string|null);
    }

    /** Represents a Ping. */
    class Ping implements IPing {

        /**
         * Constructs a new Ping.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IPing);

        /** Ping id. */
        public id: string;

        /**
         * Creates a new Ping instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Ping instance
         */
        public static create(properties?: relay.IPing): relay.Ping;

        /**
         * Encodes the specified Ping message. Does not implicitly {@link relay.Ping.verify|verify} messages.
         * @param message Ping message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IPing, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Ping message, length delimited. Does not implicitly {@link relay.Ping.verify|verify} messages.
         * @param message Ping message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IPing, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Ping message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Ping
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.Ping;

        /**
         * Decodes a Ping message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Ping
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.Ping;

        /**
         * Verifies a Ping message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Ping message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Ping
         */
        public static fromObject(object: { [k: string]: any }): relay.Ping;

        /**
         * Creates a plain object from a Ping message. Also converts values to other types if specified.
         * @param message Ping
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.Ping, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Ping to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Ping
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Pong. */
    interface IPong {

        /** Pong id */
        id?: (string|null);
    }

    /** Represents a Pong. */
    class Pong implements IPong {

        /**
         * Constructs a new Pong.
         * @param [properties] Properties to set
         */
        constructor(properties?: relay.IPong);

        /** Pong id. */
        public id: string;

        /**
         * Creates a new Pong instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Pong instance
         */
        public static create(properties?: relay.IPong): relay.Pong;

        /**
         * Encodes the specified Pong message. Does not implicitly {@link relay.Pong.verify|verify} messages.
         * @param message Pong message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: relay.IPong, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Pong message, length delimited. Does not implicitly {@link relay.Pong.verify|verify} messages.
         * @param message Pong message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: relay.IPong, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Pong message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Pong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): relay.Pong;

        /**
         * Decodes a Pong message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Pong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): relay.Pong;

        /**
         * Verifies a Pong message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Pong message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Pong
         */
        public static fromObject(object: { [k: string]: any }): relay.Pong;

        /**
         * Creates a plain object from a Pong message. Also converts values to other types if specified.
         * @param message Pong
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: relay.Pong, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Pong to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Pong
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}
