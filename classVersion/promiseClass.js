"use strict";

const STATE = {
  PENDING: Symbol.for("PENDING"),
  FULFILLED: Symbol.for("FULFILLED"),
  REJECTED: Symbol.for("REJECTED"),
};

export class Promise {
  #state = STATE.PENDING; // define state as private field, 2.1.1
  #callback = []; // callback as queue
  #value; // save value

  // executor would be a function which take functions resolve and reject as parameters
  constructor(executor) {
    try {
      executor(
        this.#internalResolve.bind(this),
        this.#internalReject.bind(this)
      );
    } catch (err) {
      this.#internalReject(err);
    }
  }

  #isFunction(func) {
    return func && typeof func === "function";
  }

  #isObject(obj) {
    return obj && typeof obj === "object";
  }

  // 2.2.2.1 onFulfilled must be called after promise is fulfilled, with promise’s value as its first argument.
  #internalResolve(value) {
    if (this.#state == STATE.PENDING) {
      this.#state = STATE.FULFILLED; // 2.1.2
      this.#value = value; // 2.1.2.2

      // 2.2.6.1
      setTimeout(
        () => this.#callback.forEach(({ resolveFunc }) => resolveFunc()),
        0
      );
    }
  }

  #internalReject(reason) {
    if (this.#state == STATE.PENDING) {
      // 2.2.3.2 it must not be called before promise is rejected.
      this.#state = STATE.REJECTED; // 2.1.3
      this.#value = reason; // 2.1.3.2
      // 2.2.6.2
      setTimeout(
        () => this.#callback.forEach(({ rejectFunc }) => rejectFunc()),
        0
      );
    }
  }

  // pass functions onFulfilled and onRejected through then
  then(onFulfilled, onRejected) {
    let self = this;
    // 2.2.1 Both onFulfilled and onRejected are optional arguments, if any is not function, must ignore it
    let fulfillFunc = this.#isFunction(onFulfilled)
        ? onFulfilled
        : (value) => value,
      rejectFunc = this.#isFunction(onRejected)
        ? onRejected
        : (err) => {
            throw err;
          },
      promise2;

    function handleResult(resolve2, reject2) {
      return () => {
        try {
          // 2.2.7.1, 2.2.7.2
          let func = self.#state == STATE.FULFILLED ? fulfillFunc : rejectFunc;
          self.#resolvePromise(promise2, func(self.#value), resolve2, reject2);
        } catch (err) {
          reject2(err);
        }
      };
    }

    return (promise2 = new Promise((resolve2, reject2) =>
      setTimeout(() => {
        switch (self.#state) {
          case STATE.PENDING:
            return self.#callback.push({
              resolveFunc: handleResult(resolve2, reject2),
              rejectFunc: handleResult(resolve2, reject2),
            });
          case STATE.FULFILLED:
          case STATE.REJECTED:
            return setTimeout(handleResult(resolve2, reject2), 0);
        }
      }, 0)
    ));
  }

  #resolvePromise(promise2, x, resolve2, reject2) {
    let self = this;
    if (promise2 == x) {
      return reject2(new TypeError("Value cannot be the same as promise!"));
    } else if (x && (this.#isObject(x) || this.#isFunction(x))) {
      let handleFuncCalled = false; // 2.3.3.3.3
      try {
        let then = x.then; // 2.3.3.1
        if (this.#isFunction(then)) {
          // 2.3.3.3
          then.call(
            x,
            function resolvePromise(y) {
              if (handleFuncCalled) return;
              handleFuncCalled = true;
              self.#resolvePromise(promise2, y, resolve2, reject2); // 2.3.3.3.1
            },
            function rejectPromise(err) {
              if (handleFuncCalled) return;
              handleFuncCalled = true;
              reject2(err); // 2.3.3.3.2
            }
          );
        } else {
          resolve2(x); // 2.3.3.4
        }
      } catch (err) {
        // 2.3.3.2
        if (handleFuncCalled) return; // 2.3.3.3.4.1
        handleFuncCalled = true;
        reject2(err); // 2.3.3.3.4.2
      }
    } else {
      resolve2(x); // 2.3.4
    }
  }
}
