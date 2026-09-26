import Link from 'next/link';
import {exampleContributionBadge} from '@/lib/contribution-receipt-http';

export function ContributorBadgeExample() {
  return <figure className="contributor-badge-example">
    <div dangerouslySetInnerHTML={{__html:exampleContributionBadge()}}/>
    <figcaption>Example only · no contribution is verified here.</figcaption>
  </figure>;
}

export function ContributorBadgePromo() {
  return <aside className="contributor-badge-promo" aria-labelledby="contributor-badge-title">
    <div><h2 id="contributor-badge-title">Useful work. Public credit.</h2>
      <p>Produce an accepted contribution and share a badge linked to its public evidence.</p>
      <Link href="/contributor-badges">How contributor badges work →</Link>
    </div>
    <ContributorBadgeExample/>
  </aside>;
}
