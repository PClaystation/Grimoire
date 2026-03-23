import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseArchidektDeckPage,
  parseTappedOutDeckPage,
} from '../server/deckSiteImport.ts'

test('parseArchidektDeckPage normalizes the embedded deck payload into a Grimoire decklist', () => {
  const html = `
    <html>
      <head>
        <meta name="twitter:data2" content="Commander" />
      </head>
      <body>
        <script id="__NEXT_DATA__" type="application/json">
          ${JSON.stringify({
            props: {
              pageProps: {
                redux: {
                  deck: {
                    name: 'Archidekt Sample',
                    categories: {
                      Sideboard: { includedInDeck: true },
                      Maybeboard: { includedInDeck: false },
                    },
                    cardMap: {
                      one: { name: 'Sol Ring', qty: 1, setCode: 'cmm', categories: ['Deck'] },
                      two: { name: 'Swords to Plowshares', qty: 2, setCode: 'lea', categories: ['Sideboard'] },
                      three: { name: 'Ignored Card', qty: 1, setCode: 'lea', categories: ['Maybeboard'] },
                    },
                  },
                },
              },
            },
          })}
        </script>
      </body>
    </html>
  `

  const result = parseArchidektDeckPage(html, 'https://archidekt.com/decks/123')

  assert.equal(result.provider, 'Archidekt')
  assert.match(result.normalizedDecklist, /# Archidekt Sample/)
  assert.match(result.normalizedDecklist, /# Format: commander/)
  assert.match(result.normalizedDecklist, /Deck\n1 Sol Ring \(CMM\)/)
  assert.match(result.normalizedDecklist, /Sideboard\n2 Swords to Plowshares \(LEA\)/)
  assert.doesNotMatch(result.normalizedDecklist, /Ignored Card/)
})

test('parseTappedOutDeckPage extracts the deck export textarea cleanly', () => {
  const html = `
    <html>
      <head>
        <title>Commander EDH deck (Commander / EDH MTG Deck)</title>
      </head>
      <body>
        <textarea id="mtga-textarea">About
Name Commander EDH deck

Commander
1x Sisay, Weatherlight Captain (MH1) 29

Deck
1x Sol Ring (CMM) 1
2x Island (FDN) 1

Sideboard
1x Negate (M11) 1
</textarea>
      </body>
    </html>
  `

  const result = parseTappedOutDeckPage(html, 'https://tappedout.net/mtg-decks/example/')

  assert.equal(result.provider, 'TappedOut')
  assert.match(result.normalizedDecklist, /# Commander EDH deck/)
  assert.match(result.normalizedDecklist, /# Format: commander/)
  assert.match(result.normalizedDecklist, /Deck\n1 Sisay, Weatherlight Captain \(MH1\) 29\n1 Sol Ring/)
  assert.match(result.normalizedDecklist, /Sideboard\n1 Negate \(M11\) 1/)
})
