import { ClosingCta } from './sections/ClosingCta';
import { DraftToPublish } from './sections/DraftToPublish';
import { ExamplePortfolio } from './sections/ExamplePortfolio';
import { Faq } from './sections/Faq';
import { Hero } from './sections/Hero';
import { Integrations } from './sections/Integrations';
import { SectionTypes } from './sections/SectionTypes';
import { SiteFooter } from './sections/SiteFooter';
import { SiteHeader } from './sections/SiteHeader';
import { Theming } from './sections/Theming';

export function App() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <ExamplePortfolio />
        <SectionTypes />
        <Integrations />
        <Theming />
        <DraftToPublish />
        <Faq />
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  );
}
