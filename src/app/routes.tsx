import { createBrowserRouter } from "react-router";
import { Home } from "./screens/Home";
import { PeopleCount } from "./screens/PeopleCount";
import { BonusSelection } from "./screens/BonusSelection";
import { TemplateSelection } from "./screens/TemplateSelection";
import { PhotoArrangement } from "./screens/PhotoArrangement";
import { AddOnQuestion } from "./screens/AddOnQuestion";
import { BonusGuide } from "./screens/BonusGuide";
import { PhotoArrangementA4 } from "./screens/PhotoArrangementA4";
import { BingkaiA4Page } from "./screens/BingkaiA4Page";
import { FlowerHotwheelsPage } from "./screens/AddOns/FlowerHotwheelsPage";
import { KeychainOptions } from "./screens/AddOns/Keychainoptions";
import { KeychainArrangement } from "./screens/AddOns/Keychainarrangement";
import { IdCardOptions } from "./screens/AddOns/IdCardOptions";
import { IdCardArrangement } from "./screens/AddOns/Idcardarrangement";
import { StoryQuestion } from "./screens/AddOns/Storyquestion";
import { CompletePage } from "./screens/AddOns/Completepage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/people-count",
    Component: PeopleCount,
  },
  {
    path: "/bonus",
    Component: BonusSelection,
  },
  {
    path: "/templates",
    Component: TemplateSelection,
  },
  {
    path: "/arrange-photos",
    Component: PhotoArrangement,
  },
  {
    path: "/bonus-guide",
    Component: BonusGuide,
  },
  {
    path: "/add-ons",
    Component: AddOnQuestion,
  },
  {
    path: "/arrange-photos-a4",
    Component: PhotoArrangementA4,
  },
  {
    path: "/bingkaiA4",
    Component: BingkaiA4Page,
  },
  {
    path: "/bingkai4R",
    Component: BingkaiA4Page,
  },
  {
    path: "/flower-hotwheels",
    Component: FlowerHotwheelsPage,
  },
  {
    path: "/cetak-bingkai3d-10r",
    Component: FlowerHotwheelsPage,
  },
  {
    path: "/cermin-foto-3d",
    Component: FlowerHotwheelsPage,
  },
  {
    path: "/boneka-tabung",
    Component: FlowerHotwheelsPage,
  },
  {
    path: "/puzzle-foto",
    Component: FlowerHotwheelsPage,
  },
  {
    path: "/keychain",
    Component: KeychainOptions,
  },
  {
    path: "/keychain-arrangement",
    Component: KeychainArrangement,
  },
  {
    path: "/id-card",
    Component: IdCardOptions,
  },
  {
    path: "/idcard-arrangement",
    Component: IdCardArrangement,
  },
  {
    path: "/story-question",
    Component: StoryQuestion,
  },
  {
    path: "/complete",
    Component: CompletePage,
  },
]);
