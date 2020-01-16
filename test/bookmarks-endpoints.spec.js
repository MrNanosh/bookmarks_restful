const knex = require('knex');
const fixtures = require('./bookmarks-fixtures');
const app = require('../src/app');

describe('Bookmarks Endpoints', () => {
  let db;

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection:
        process.env.TEST_DATABASE_URL
    });
    app.set('db', db);
  });

  after('disconnect from db', () => {
    return db.destroy();
  });

  before('cleanup', () => {
    return db('bookmarks').truncate();
    // .then(() => {
    //   console.log('hey!!!!!!!!!');
    //   db('bookmarks')
    //     .select('*')
    //     .then(bookmarks => {
    //       console.log(bookmarks);
    //     });
    // });
  });

  afterEach('cleanup', () => {
    return db('bookmarks').truncate();
    //     .then(() => {
    //       console.log('hey!!!!!!!!!');
    //       return db('bookmarks')
    //         .select('*')
    //         .then(bookmarks => {
    //           console.log(bookmarks);
    //         });
    //     });
  });

  describe(`Unauthorized requests`, () => {
    const testBookmarks = fixtures.makeBookmarksArray();

    beforeEach(
      'insert bookmarks',
      () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks);
      }
    );

    it(`responds with 401 Unauthorized for GET /bookmarks`, () => {
      return supertest(app)
        .get('/bookmarks')
        .expect(401, {
          error: 'Unauthorized request'
        });
    });

    it(`responds with 401 Unauthorized for POST /bookmarks`, () => {
      return supertest(app)
        .post('/bookmarks')
        .send({
          title: 'test-title',
          url: 'http://some.thing.com',
          rating: 1
        })
        .expect(401, {
          error: 'Unauthorized request'
        });
    });

    it(`responds with 401 Unauthorized for GET /bookmarks/:id`, () => {
      const secondBookmark =
        testBookmarks[1];
      return supertest(app)
        .get(
          `/bookmarks/${secondBookmark.id}`
        )
        .expect(401, {
          error: 'Unauthorized request'
        });
    });

    it(`responds with 401 Unauthorized for DELETE /bookmarks/:id`, () => {
      const aBookmark =
        testBookmarks[1];
      return supertest(app)
        .delete(
          `/bookmarks/${aBookmark.id}`
        )
        .expect(401, {
          error: 'Unauthorized request'
        });
    });
  });

  describe('GET /bookmarks', () => {
    context(
      `Given no bookmarks`,
      () => {
        it(`responds with 200 and an empty list`, () => {
          return supertest(app)
            .get('/bookmarks')
            .set(
              'Authorization',
              `Bearer ${process.env.API_TOKEN}`
            )
            .expect(200, []);
        });
      }
    );

    context(
      'Given there are bookmarks in the database',
      () => {
        const testBookmarks = fixtures.makeBookmarksArray();

        beforeEach(
          'insert bookmarks',
          () => {
            return db
              .into('bookmarks')
              .insert(testBookmarks);
          }
        );

        it('gets the bookmarks from the store', () => {
          return supertest(app)
            .get('/bookmarks')
            .set(
              'Authorization',
              `Bearer ${process.env.API_TOKEN}`
            )
            .expect(200, testBookmarks);
        });
      }
    );

    context(
      `Given an XSS attack bookmark`,
      () => {
        const {
          maliciousBookmark,
          expectedBookmark
        } = fixtures.makeMaliciousBookmark();

        beforeEach(
          'insert malicious bookmark',
          () => {
            return db
              .into('bookmarks')
              .insert([
                maliciousBookmark
              ]);
          }
        );

        it('removes XSS attack content', () => {
          return supertest(app)
            .get(`/bookmarks`)
            .set(
              'Authorization',
              `Bearer ${process.env.API_TOKEN}`
            )
            .expect(200)
            .expect(res => {
              expect(
                res.body[0].title
              ).to.eql(
                expectedBookmark.title
              );
              expect(
                res.body[0].description
              ).to.eql(
                expectedBookmark.description
              );
            });
        });
      }
    );
  });

  describe('GET /bookmarks/:id', () => {
    context(
      `Given no bookmarks`,
      () => {
        it(`responds 404 whe bookmark doesn't exist`, () => {
          return supertest(app)
            .get(`/bookmarks/123`)
            .set(
              'Authorization',
              `Bearer ${process.env.API_TOKEN}`
            )
            .expect(404, {
              error: {
                message: `Bookmark Not Found`
              }
            });
        });
      }
    );

    context(
      'Given there are bookmarks in the database',
      () => {
        const testBookmarks = fixtures.makeBookmarksArray();

        beforeEach(
          'insert bookmarks',
          () => {
            return db
              .into('bookmarks')
              .insert(testBookmarks);
          }
        );

        it('responds with 200 and the specified bookmark', () => {
          const bookmarkId = 2;
          const expectedBookmark =
            testBookmarks[
              bookmarkId - 1
            ];
          return supertest(app)
            .get(
              `/bookmarks/${bookmarkId}`
            )
            .set(
              'Authorization',
              `Bearer ${process.env.API_TOKEN}`
            )
            .expect(
              200,
              expectedBookmark
            );
        });
      }
    );

    context(
      `Given an XSS attack bookmark`,
      () => {
        const {
          maliciousBookmark,
          expectedBookmark
        } = fixtures.makeMaliciousBookmark();

        beforeEach(
          'insert malicious bookmark',
          () => {
            return db
              .into('bookmarks')
              .insert([
                maliciousBookmark
              ]);
          }
        );

        it('removes XSS attack content', () => {
          return supertest(app)
            .get(
              `/bookmarks/${maliciousBookmark.id}`
            )
            .set(
              'Authorization',
              `Bearer ${process.env.API_TOKEN}`
            )
            .expect(200)
            .expect(res => {
              expect(
                res.body.title
              ).to.eql(
                expectedBookmark.title
              );
              expect(
                res.body.description
              ).to.eql(
                expectedBookmark.description
              );
            });
        });
      }
    );
  });

  describe('DELETE /bookmarks/:id', () => {
    context(
      `Given no bookmarks`,
      () => {
        it(`responds 404 whe bookmark doesn't exist`, () => {
          return supertest(app)
            .delete(`/bookmarks/123`)
            .set(
              'Authorization',
              `Bearer ${process.env.API_TOKEN}`
            )
            .expect(404, {
              error: {
                message: `Bookmark Not Found`
              }
            });
        });
      }
    );

    context(
      'Given there are bookmarks in the database',
      () => {
        const testBookmarks = fixtures.makeBookmarksArray();

        beforeEach(
          'insert bookmarks',
          () => {
            return db
              .into('bookmarks')
              .insert(testBookmarks);
          }
        );

        it('removes the bookmark by ID from the store', () => {
          const idToRemove = 2;
          const expectedBookmarks = testBookmarks.filter(
            bm => bm.id !== idToRemove
          );
          return supertest(app)
            .delete(
              `/bookmarks/${idToRemove}`
            )
            .set(
              'Authorization',
              `Bearer ${process.env.API_TOKEN}`
            )
            .expect(204)
            .then(() =>
              supertest(app)
                .get(`/bookmarks`)
                .set(
                  'Authorization',
                  `Bearer ${process.env.API_TOKEN}`
                )
                .expect(
                  expectedBookmarks
                )
            );
        });
      }
    );
  });

  describe('POST /bookmarks', () => {
    it(`responds with 400 missing 'title' if not supplied`, () => {
      const newBookmarkMissingTitle = {
        // title: 'test-title',
        url: 'https://test.com',
        rating: 1
      };

      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmarkMissingTitle)
        .set(
          'Authorization',
          `Bearer ${process.env.API_TOKEN}`
        )
        .expect(
          400,
          `'title' is required`
        );
    });

    it(`responds with 400 missing 'url' if not supplied`, () => {
      const newBookmarkMissingUrl = {
        title: 'test-title',
        // url: 'https://test.com',
        rating: 1
      };
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmarkMissingUrl)
        .set(
          'Authorization',
          `Bearer ${process.env.API_TOKEN}`
        )
        .expect(
          400,
          `'url' is required`
        );
    });

    it(`responds with 400 missing 'rating' if not supplied`, () => {
      const newBookmarkMissingRating = {
        title: 'test-title',
        url: 'https://test.com'
        // rating: 1,
      };
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmarkMissingRating)
        .set(
          'Authorization',
          `Bearer ${process.env.API_TOKEN}`
        )
        .expect(
          400,
          `'rating' is required`
        );
    });

    it(`responds with 400 invalid 'rating' if not between 0 and 5`, () => {
      const newBookmarkInvalidRating = {
        title: 'test-title',
        url: 'https://test.com',
        rating: 'invalid'
      };
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmarkInvalidRating)
        .set(
          'Authorization',
          `Bearer ${process.env.API_TOKEN}`
        )
        .expect(
          400,
          `'rating' must be a number between 0 and 5`
        );
    });

    it(`responds with 400 invalid 'url' if not a valid URL`, () => {
      const newBookmarkInvalidUrl = {
        title: 'test-title',
        url: 'htp://invalid-url',
        rating: 1
      };
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmarkInvalidUrl)
        .set(
          'Authorization',
          `Bearer ${process.env.API_TOKEN}`
        )
        .expect(
          400,
          `'url' must be a valid URL`
        );
    });

    it('adds a new bookmark to the store', () => {
      const newBookmark = {
        title: 'test-title',
        url: 'https://test.com',
        description: 'test description',
        rating: 1
      };
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmark)
        .set(
          'Authorization',
          `Bearer ${process.env.API_TOKEN}`
        )
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(
            newBookmark.title
          );
          expect(res.body.url).to.eql(
            newBookmark.url
          );
          expect(
            res.body.description
          ).to.eql(
            newBookmark.description
          );
          expect(
            res.body.rating
          ).to.eql(newBookmark.rating);
          expect(
            res.body
          ).to.have.property('id');
        })
        .then(res =>
          supertest(app)
            .get(
              `/bookmarks/${res.body.id}`
            )
            .set(
              'Authorization',
              `Bearer ${process.env.API_TOKEN}`
            )
            .expect(res.body)
        );
    });

    it('removes XSS attack content from response', () => {
      const {
        maliciousBookmark,
        expectedBookmark
      } = fixtures.makeMaliciousBookmark();
      return supertest(app)
        .post(`/bookmarks`)
        .send(maliciousBookmark)
        .set(
          'Authorization',
          `Bearer ${process.env.API_TOKEN}`
        )
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(
            expectedBookmark.title
          );
          expect(
            res.body.description
          ).to.eql(
            expectedBookmark.description
          );
        });
    });
  });

  describe.only('PATCH /bookmarks/:id', () => {
    context(
      'provided there are no bookmarks in the database',
      () => {
        it('returns a 404 error', () => {
          return supertest(app)
            .patch('/bookmarks/1337')
            .set(
              'Authorization',
              `Bearer ${process.env.API_TOKEN}`
            )
            .send({
              title: `this title doesn't matter`
            })
            .expect(404)
            .expect(res => {
              return expect(
                res.body.error
              ).to.include({
                message:
                  'Bookmark Not Found'
              });
            });
        });
      }
    );

    context(
      'there are bookmarks in the database',
      () => {
        const testBookmarks = fixtures.makeBookmarksArray();

        beforeEach(
          'populate tables',
          () => {
            return db
              .into('bookmarks')
              .insert(testBookmarks);
          }
        );
        // It requires the bookmark's ID to be supplied as a URL param
        it('requires the bookmarks ID to be supplied as a URL param', () => {
          return supertest(app)
            .patch('/bookmarks')
            .set(
              'Authorization',
              `Bearer ${process.env.API_TOKEN}`
            )
            .send({
              title: 'some stuff'
            })
            .expect(400)
            .expect(res => {
              return expect(
                res.body.error.message
              ).to.eql(
                'bookmark id must be specified as a parameter'
              );
            });
        });

        // It responds with a 204 and no content when successful
        it('responds with a 204 and no content when successful', () => {
          const goodPatch = {
            url: 'https://zombo.com'
          };

          const location = `/bookmarks/${testBookmarks[1].id}`;
          const expectation = {
            ...testBookmarks[1],
            ...goodPatch
          };
          return supertest(app)
            .patch(location)
            .set(
              'Authorization',
              `Bearer ${process.env.API_TOKEN}`
            )
            .send(goodPatch)
            .expect(204)
            .expect(() => {
              return supertest(app)
                .get(location)
                .expect(
                  200,
                  expectation
                ); // It updates the bookmark in your database table
            });
        });

        // It responds with a 400 when no values are supplied for any fields (title, url, description, rating)
        it('responds with a 400 when no values are supplied for any fields (title, url, description, rating)', () => {
          return supertest(app)
            .patch(
              `/bookmarks/${testBookmarks[0].id}`
            )
            .set(
              'Authorization',
              `Bearer ${process.env.API_TOKEN}`
            )
            .send({})
            .expect(400)
            .expect(res => {
              return expect(
                res.body.error.message
              ).to.eql(
                `Error: request body must contain either 'url', 'desc', 'rating' or 'title'.`
              );
            });
        });
      }
    );
  });
});
