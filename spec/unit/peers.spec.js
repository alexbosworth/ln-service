const { addPeer, getPeers, removePeer } = require('../../lightning');
const { localLnd } = require('../../service');
const {readFileSync} = require('fs');

describe('Peers', () => {
  const lnd = localLnd({});

  describe('addPeer()', () => {
    it('adds a new peer to the node', (done) => {

      let fakePeerObject = {
        lnd,
        host: 'localhost',
        public_key: '03cea4d1351308e8b16f8f41b30ab9c4f1072d23fc486e7919dabbe3a59bb65e5e',
      };

      addPeer(fakePeerObject).then(result => {
        expect(result).not.toBe(null);
        done();
      });
    });
  });

  describe('removePeer()', () => {
    it('does not remove a peer that is not connected', (done) => {

      let fakePeerObject = {
        lnd,
        host: 'localhost',
        public_key: '03cea4d1351308e8b16f8f41b30ab9c4f1072d23fc486e7919dabbe3a59bb65e5e',
      };

      removePeer(fakePeerObject).then(result => {
        expect(result).not.toBe(null);
        done();
      }).catch(error => {
        expect(error[1]).toBe('ErrorRemovingPeer');
        done();
      });
    });
  });

  describe('listPeers()', () => {
    it('lists peers connected', (done) => {
      getPeers({lnd}).then(result => {
        expect(result).not.toBe(null);
        done();
      }).catch(error => {
        expect(error[1]).toBe('ErrorRemovingPeer');
        done();
      });
    });
  });
});
