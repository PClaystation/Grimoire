import { useEffect, useMemo } from 'react'

import { buildAppRouteUrl } from '@/utils/appRouteUrl'

export const SITE_NAME = 'Grimoire by Continental'

interface SeoMetadata {
  title: string
  description: string
  canonicalPath?: string
  canonicalUrl?: string
  robots?: string
  openGraphType?: 'website' | 'article'
  imageUrl?: string
  imageAlt?: string
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>
}

function buildAssetUrl(assetPath: string) {
  const normalizedBasePath = String(import.meta.env.BASE_URL || '/')
  const normalizedAssetPath = assetPath.replace(/^\/+/, '')
  return new URL(`${normalizedBasePath}${normalizedAssetPath}`, window.location.origin).toString()
}

function manageHeadElement<T extends HTMLElement>(
  selector: string,
  createElement: () => T,
  applyElement: (element: T) => void,
) {
  const existingElement = document.head.querySelector<T>(selector)

  if (existingElement) {
    const snapshot = existingElement.cloneNode(true) as T
    applyElement(existingElement)

    return () => {
      if (existingElement.isConnected) {
        existingElement.replaceWith(snapshot)
      }
    }
  }

  const element = createElement()
  applyElement(element)
  document.head.appendChild(element)

  return () => {
    if (element.isConnected) {
      element.remove()
    }
  }
}

export function useSeoMetadata({
  title,
  description,
  canonicalPath,
  canonicalUrl,
  robots = 'index,follow,max-image-preview:large',
  openGraphType = 'website',
  imageUrl,
  imageAlt = 'Grimoire by Continental',
  structuredData,
}: SeoMetadata) {
  const resolvedCanonicalUrl =
    canonicalUrl ?? (canonicalPath ? buildAppRouteUrl(canonicalPath) : window.location.href)
  const resolvedImageUrl = imageUrl ?? buildAssetUrl('branding/c2-mark-white.png')
  const structuredDataEntries = useMemo(() => {
    if (!structuredData) {
      return []
    }

    return Array.isArray(structuredData) ? structuredData : [structuredData]
  }, [structuredData])
  const structuredDataKey = JSON.stringify(structuredDataEntries)

  useEffect(() => {
    const previousTitle = document.title
    const cleanups = [
      manageHeadElement(
        'meta[name="description"]',
        () => document.createElement('meta'),
        (element) => {
          element.setAttribute('name', 'description')
          element.setAttribute('content', description)
        },
      ),
      manageHeadElement(
        'meta[name="robots"]',
        () => document.createElement('meta'),
        (element) => {
          element.setAttribute('name', 'robots')
          element.setAttribute('content', robots)
        },
      ),
      manageHeadElement(
        'link[rel="canonical"]',
        () => document.createElement('link'),
        (element) => {
          element.setAttribute('rel', 'canonical')
          element.setAttribute('href', resolvedCanonicalUrl)
        },
      ),
      manageHeadElement(
        'meta[property="og:type"]',
        () => document.createElement('meta'),
        (element) => {
          element.setAttribute('property', 'og:type')
          element.setAttribute('content', openGraphType)
        },
      ),
      manageHeadElement(
        'meta[property="og:site_name"]',
        () => document.createElement('meta'),
        (element) => {
          element.setAttribute('property', 'og:site_name')
          element.setAttribute('content', SITE_NAME)
        },
      ),
      manageHeadElement(
        'meta[property="og:title"]',
        () => document.createElement('meta'),
        (element) => {
          element.setAttribute('property', 'og:title')
          element.setAttribute('content', title)
        },
      ),
      manageHeadElement(
        'meta[property="og:description"]',
        () => document.createElement('meta'),
        (element) => {
          element.setAttribute('property', 'og:description')
          element.setAttribute('content', description)
        },
      ),
      manageHeadElement(
        'meta[property="og:url"]',
        () => document.createElement('meta'),
        (element) => {
          element.setAttribute('property', 'og:url')
          element.setAttribute('content', resolvedCanonicalUrl)
        },
      ),
      manageHeadElement(
        'meta[property="og:image"]',
        () => document.createElement('meta'),
        (element) => {
          element.setAttribute('property', 'og:image')
          element.setAttribute('content', resolvedImageUrl)
        },
      ),
      manageHeadElement(
        'meta[property="og:image:alt"]',
        () => document.createElement('meta'),
        (element) => {
          element.setAttribute('property', 'og:image:alt')
          element.setAttribute('content', imageAlt)
        },
      ),
      manageHeadElement(
        'meta[name="twitter:card"]',
        () => document.createElement('meta'),
        (element) => {
          element.setAttribute('name', 'twitter:card')
          element.setAttribute('content', 'summary')
        },
      ),
      manageHeadElement(
        'meta[name="twitter:title"]',
        () => document.createElement('meta'),
        (element) => {
          element.setAttribute('name', 'twitter:title')
          element.setAttribute('content', title)
        },
      ),
      manageHeadElement(
        'meta[name="twitter:description"]',
        () => document.createElement('meta'),
        (element) => {
          element.setAttribute('name', 'twitter:description')
          element.setAttribute('content', description)
        },
      ),
      manageHeadElement(
        'meta[name="twitter:url"]',
        () => document.createElement('meta'),
        (element) => {
          element.setAttribute('name', 'twitter:url')
          element.setAttribute('content', resolvedCanonicalUrl)
        },
      ),
      manageHeadElement(
        'meta[name="twitter:image"]',
        () => document.createElement('meta'),
        (element) => {
          element.setAttribute('name', 'twitter:image')
          element.setAttribute('content', resolvedImageUrl)
        },
      ),
      manageHeadElement(
        'meta[name="twitter:image:alt"]',
        () => document.createElement('meta'),
        (element) => {
          element.setAttribute('name', 'twitter:image:alt')
          element.setAttribute('content', imageAlt)
        },
      ),
    ]
    const structuredDataScripts = structuredDataEntries.map((entry) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.grimoireStructuredData = 'true'
      script.textContent = JSON.stringify(entry)
      document.head.appendChild(script)
      return script
    })

    document.title = title

    return () => {
      document.title = previousTitle
      structuredDataScripts.forEach((script) => {
        if (script.isConnected) {
          script.remove()
        }
      })
      cleanups.reverse().forEach((cleanup) => cleanup())
    }
  }, [
    canonicalPath,
    description,
    imageAlt,
    openGraphType,
    resolvedCanonicalUrl,
    resolvedImageUrl,
    robots,
    structuredDataEntries,
    structuredDataKey,
    title,
  ])
}
