import { ForbiddenException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime'
import * as argon from 'argon2'
import { PrismaService } from '../prisma/prisma.service'
import { AuthDto } from './dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signUp({ email, password }: AuthDto) {
    const hash = await argon.hash(password)

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          hash,
        },
      })

      return this.signToken(user.id, email)
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials taken')
        }
      }
      throw error
    }
  }

  async signIn({ email, password }: AuthDto) {
    const user = await this.prisma.user.findUnique({ where: { email } })

    if (!user) throw new ForbiddenException('Credentials incorrect')

    const passwordMatches = await argon.verify(user.hash, password)

    if (!passwordMatches) throw new ForbiddenException('Credentials incorrect')

    delete user.hash

    return this.signToken(user.id, email)
  }

  private async signToken(
    userId: number,
    email: string,
  ): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email,
    }

    const token = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
      secret: this.config.get('JWT_SECRET'),
    })

    return {
      access_token: token,
    }
  }
}
