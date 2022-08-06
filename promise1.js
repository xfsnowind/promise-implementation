const STATE = {
  PENDING: Symbol.for("pending"),
  FULFILLED: Symbol.for("fulfilled"),
  REJECTED: Symbol.for("rejected"),
};

const isFunction = (func) => func && typeof func === "function";
const isObject = (arg) => arg && typeof arg === "object";

function Promise(executor) {
  let self = this;

  // set the state as pending, 2.1.1
  self.state = STATE.PENDING;

  self.callback = [];

  // 2.2.2.1 onFulfilled must be called after promise is fulfilled, with promise’s value as its first argument.
  function resolve(value) {
    if (self.state === STATE.PENDING) {
      // 2.2.2.2 it must not be called before promise is fulfilled.
      self.state = STATE.FULFILLED;
      self.value = value;
      // 2.2.6.1
      setTimeout(
        () => self.callback.forEach(({ resolveFunc }) => resolveFunc(value)),
        0
      );
    }
  }

  // 2.2.3.1 onRejected must be called after promise is rejected, with promise’s reason as its first argument.
  function reject(err) {
    if (self.state === STATE.PENDING) {
      // 2.2.3.2 it must not be called before promise is rejected.
      self.state = STATE.REJECTED;
      self.value = err;
      // 2.2.6.2
      setTimeout(
        () => self.callback.forEach(({ rejectFunc }) => rejectFunc(err)),
        0
      );
    }
  }

  try {
    // executor is function whose parameters is resolve and reject functions,
    // which would be called inside of executor.
    if (isFunction(executor)) executor(resolve, reject);
  } catch (err) {
    reject(err);
  }
}

Promise.prototype.then = function (onFulfilled, onRejected) {
  let self = this,
    promise2;

  // 2.2.1 Both onFulfilled and onRejected are optional arguments, if any is not function, must ignore it
  let fulfillFunc = isFunction(onFulfilled) ? onFulfilled : (value) => value;
  let rejectFunc = isFunction(onRejected)
    ? onRejected
    : (e) => {
        throw e;
      };

  function handleResult(resolve2, reject2) {
    return () => {
      try {
        // 2.2.7.1, 2.2.7.2
        let func = self.state == STATE.FULFILLED ? fulfillFunc : rejectFunc;
        resolvePromise(promise2, func(self.value), resolve2, reject2);
      } catch (e) {
        reject2(e);
      }
    };
  }

  return (promise2 = new Promise((resolve2, reject2) => {
    switch (self.state) {
      // if the state is fulfilled or rejected, just execute the related function and pass the result
      // to the resolvePromise
      case STATE.FULFILLED:
      case STATE.REJECTED:
        return setTimeout(handleResult(resolve2, reject2), 0);
      case STATE.PENDING:
        // if it's still pending, push the resolve/reject to callback queue
        return self.callback.push({
          resolveFunc: handleResult(resolve2, reject2),
          rejectFunc: handleResult(resolve2, reject2),
        });
    }
  }));
};

function resolvePromise(promise, x, resolve2, reject2) {
  if (promise == x) {
    return reject2(
      new TypeError("Resolved result should not be the same promise!")
    );
  } else if (x && (isFunction(x) || isObject(x))) {
    let called = false; // 2.3.3.3.3

    try {
      let then = x.then;

      if (isFunction(then)) {
        then.call( // 2.3.3.3
          x,
          function (y) {
            if (called) return;
            called = true;
            return resolvePromise(promise, y, resolve2, reject2); // 2.3.3.3.1
          },
          function (r) {
            if (called) return;
            called = true;
            return reject2(r); // 2.3.3.3.2
          }
        );
      } else {
        resolve2(x); // 2.3.3.4
      }
    } catch (err) {
      if (called) return; // 2.3.3.3.4.1
      called = true;
      reject2(err); // 2.3.3.3.4.2
    }
  } else {
    resolve2(x); // 2.3.4
  }
}

Promise.defer = Promise.deferred = function () {
  let dfd = {};
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
};

module.exports = Promise;