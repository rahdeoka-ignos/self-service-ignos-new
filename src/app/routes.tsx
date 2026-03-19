import { createBrowserRouter } from "react-router";
import { Home } from "./screens/Home";
import { PeopleCount } from "./screens/PeopleCount";
import { BonusSelection } from "./screens/BonusSelection";
import { TemplateSelection } from "./screens/TemplateSelection";
import { PhotoArrangement } from "./screens/PhotoArrangement";
import { AddOnQuestion } from "./screens/AddOnQuestion";
import { BonusGuide } from "./screens/BonusGuide";
import { PhotoArrangementA4 } from "./screens/PhotoArrangementA4";

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
]);
