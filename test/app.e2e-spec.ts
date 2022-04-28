import * as pactum from 'pactum'

import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PrismaService } from '../src/prisma/prisma.service'
import { AppModule } from '../src/app.module'
import { AuthDto } from 'src/auth/dto'
import { EditUserDto } from 'src/user/dto'
import { CreateBookmarkDto } from 'src/bookmark/dto'

describe('App e2e', () => {
  const PORT = 8000
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    )

    await app.init()
    await app.listen(8000)

    prisma = app.get(PrismaService)
    await prisma.cleanDb()
    pactum.request.setBaseUrl(`http://localhost:${PORT}`)
  })

  afterAll(() => {
    app.close()
  })

  describe('Auth', () => {
    const dto: AuthDto = {
      email: 'asd@dada.com',
      password: 'asd123',
    }

    describe('Sign up', () => {
      test('should throw if email is empty', () => {
        return pactum
          .spec()
          .post('/auth/sign-up')
          .withBody({ email: '', password: 'asd' })
          .expectStatus(400)
      })

      test('should throw if password is empty', () => {
        return pactum
          .spec()
          .post('/auth/sign-up')
          .withBody({ email: 'asd@asd.com', password: '' })
          .expectStatus(400)
      })

      test('should throw if no body is provided', () => {
        return pactum.spec().post('/auth/sign-up').expectStatus(400)
      })

      test('should sign up', () => {
        return pactum
          .spec()
          .post('/auth/sign-up')
          .withBody(dto)
          .expectStatus(201)
      })
    })

    describe('Sign in', () => {
      let accessToken

      test('should throw if email is empty', () => {
        return pactum
          .spec()
          .post('/auth/sign-in')
          .withBody({ email: '', password: 'asd' })
          .expectStatus(400)
      })

      test('should throw if password is empty', () => {
        return pactum
          .spec()
          .post('/auth/sign-in')
          .withBody({ email: 'asd@asd.com', password: '' })
          .expectStatus(400)
      })

      test('should throw if no body is provided', () => {
        return pactum.spec().post('/auth/sign-in').expectStatus(400)
      })

      test('should sign in with correct credentials', () => {
        return pactum
          .spec()
          .post('/auth/sign-in')
          .withBody(dto)
          .expectStatus(200)
          .stores('userAt', 'access_token')
      })
    })
  })

  describe('User', () => {
    describe('Get me', () => {
      test('should get current user', () => {
        return pactum
          .spec()
          .get('/users/me')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
      })
    })

    describe('Edit user', () => {
      test('should edit user', () => {
        const dto: EditUserDto = {
          firstName: 'Kek',
          email: 'asd@wawa.pl',
        }

        return pactum
          .spec()
          .patch('/users')
          .withBody(dto)
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectBodyContains(dto.firstName)
          .expectBodyContains(dto.email)
      })
    })
  })

  describe('Bookmarks', () => {
    describe('create bookmark', () => {
      const dto: CreateBookmarkDto = {
        title: 'test title',
        link: 'https://test.com',
        description: 'test description',
      }

      test('should create bookmark', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withBody(dto)
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(201)
          .stores('bookmarkId', 'id')
      })
    })

    describe('get bookmark', () => {
      test('should get bookmarks', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectJsonLength(1)
      })
    })

    describe('get bookmark by id', () => {
      test('should get bookmark by id', () => {
        return pactum
          .spec()
          .get('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .inspect()
      })
    })

    describe('edit bookmark by id', () => {})

    describe('delete bookmark by id', () => {})
  })
})
