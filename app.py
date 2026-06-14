"""Streamlit app: Fabric Supplier Finder.

Run:
    streamlit run app.py
"""

from __future__ import annotations

import streamlit as st

from src.i18n import t
from src.inquiry import build_inquiry, mailto_link
from src.pricing import format_range, indicative_range
from src.search import Filters, all_certifications, apply_filters, load_suppliers
from src.web_search import build_query, search_web


st.set_page_config(page_title="Fabric Supplier Finder", page_icon="🧵", layout="wide")


# ----- language switcher -----
if "lang" not in st.session_state:
    st.session_state.lang = "sk"

col_a, col_b = st.columns([6, 1])
with col_b:
    st.session_state.lang = st.selectbox(
        "🌐",
        options=["sk", "en"],
        index=0 if st.session_state.lang == "sk" else 1,
        label_visibility="collapsed",
    )

lang = st.session_state.lang


def tt(key: str) -> str:
    return t(lang, key)


st.title("🧵 " + tt("app_title"))
st.caption(tt("app_subtitle"))
st.info(tt("principles_warning"))


# ----- load data -----
suppliers = load_suppliers()


# ----- sidebar filters -----
with st.sidebar:
    st.header("🔍 " + tt("filters"))

    materials = st.multiselect(
        tt("material"),
        options=["silk", "cotton", "tencel", "bamboo"],
        format_func=lambda m: {
            "silk": tt("silk"),
            "cotton": tt("cotton"),
            "tencel": tt("tencel"),
            "bamboo": tt("bamboo"),
        }[m],
        default=["silk"],
    )

    only_mulberry = False
    mommi_selected: list[int] = []
    if "silk" in materials:
        only_mulberry = st.checkbox(tt("silk_only_mulberry"), value=True)
        mommi_selected = st.multiselect(
            tt("silk_mommi"),
            options=[12, 16, 19, 22, 25, 30, 35],
            default=[19, 22],
        )

    dyeing_required = st.checkbox(tt("dyeing_required"), value=True)
    exclude_resellers = st.checkbox(tt("exclude_resellers"), value=True)
    exclude_synthetic_satin = st.checkbox(tt("exclude_synthetic_satin"), value=True)

    regions = st.multiselect(
        tt("region"),
        options=["Europe", "Asia", "Other"],
        format_func=lambda r: {
            "Europe": tt("region_europe"),
            "Asia": tt("region_asia"),
            "Other": tt("region_other"),
        }[r],
        default=["Europe"],
    )

    available_certs = all_certifications(suppliers)
    certs = st.multiselect(tt("certifications"), options=available_certs, default=[])

    tier_options = ["€", "€€", "€€€", "€€€€"]
    tier_label_map = {
        "€": tt("tier_1"),
        "€€": tt("tier_2"),
        "€€€": tt("tier_3"),
        "€€€€": tt("tier_4"),
    }
    price_tiers = st.multiselect(
        tt("price_tier"),
        options=tier_options,
        default=[],
        format_func=lambda x: tier_label_map[x],
    )
    st.caption("ℹ️ " + tt("price_disclaimer"))

    verified_only = st.checkbox(tt("verified_only"), value=False)


filters = Filters(
    materials=set(materials),
    only_mulberry=only_mulberry,
    mommi=set(mommi_selected),
    dyeing_required=dyeing_required,
    exclude_resellers=exclude_resellers,
    exclude_synthetic_satin=exclude_synthetic_satin,
    regions=set(regions),
    certifications=set(certs),
    verified_only=verified_only,
    price_tiers=set(price_tiers),
)

filtered = apply_filters(suppliers, filters)


# ----- tabs -----
tab_curated, tab_web = st.tabs(["📚 " + tt("tab_curated"), "🌐 " + tt("tab_web")])


TYPE_LABEL_KEYS = {
    "manufacturer": "type_manufacturer",
    "weaver": "type_weaver",
    "fibre_producer": "type_fibre_producer",
}


def render_supplier_card(s: dict, inquiry_subject: str, inquiry_body: str) -> None:
    badge = "✅ " + tt("verified_label") if s.get("verified") else "🔎 " + tt("to_verify_label")
    type_key = TYPE_LABEL_KEYS.get(s.get("type", ""), "supplier_type")
    type_label = tt(type_key) if type_key != "supplier_type" else s.get("type", "")

    with st.container(border=True):
        cols = st.columns([3, 1])
        with cols[0]:
            st.subheader(f"{s['name']} — {s.get('country', '')}")
            st.write(f"**{tt('supplier_type')}:** {type_label}  ·  **{tt('country')}:** {s.get('country', '')}")
        with cols[1]:
            st.write(badge)
            st.link_button(tt("open_website"), s.get("website", "#"))

        materials_offered = ", ".join(s.get("materials", []))
        st.write(f"**{tt('material')}:** {materials_offered}")

        silk = s.get("silk") or {}
        if silk:
            mommi_str = ", ".join(f"{m} mm" for m in silk.get("mommi", []) or [])
            silk_line = f"**{tt('silk')}:** mulberry={'✅' if silk.get('mulberry') else '❌'}"
            if mommi_str:
                silk_line += f"  ·  mommi: {mommi_str}"
            st.write(silk_line)

        cotton = s.get("cotton") or {}
        if cotton:
            organic = "✅" if cotton.get("organic_available") else "—"
            types = ", ".join(cotton.get("types", []) or [])
            st.write(f"**{tt('cotton')}:** organic: {organic}  ·  {types}")

        tencel = s.get("tencel") or {}
        if tencel and tencel.get("available"):
            st.write(f"**{tt('tencel')}:** ✅")

        bamboo = s.get("bamboo") or {}
        if bamboo and bamboo.get("available"):
            st.write(f"**{tt('bamboo')}:** ✅ ({bamboo.get('type', '')})")

        st.write(f"**Dyeing:** {'✅' if s.get('dyeing') else '❌'}")

        certs = s.get("certifications") or []
        if certs:
            st.write("**" + tt("certifications") + ":** " + ", ".join(certs))

        # --- MOQ box (prominent) ---
        moq_text = s.get("moq_notes") or tt("moq_unknown")
        st.info(f"📦 **{tt('moq_info')}:** {moq_text}")

        # --- Price tier box (prominent) ---
        price = s.get("price") or {}
        tier = price.get("tier")
        tier_label = price.get("notes", "")
        quoted = price.get("price_eur_per_meter")

        price_lines: list[str] = []
        if quoted is not None:
            price_lines.append(
                f"💶 **{tt('price_tier')}:** {tier or tt('tier_na')}  ·  "
                f"**{tt('price_quoted')}:** {quoted} €/m"
            )
        else:
            price_lines.append(
                f"💶 **{tt('price_tier')}:** {tier or tt('tier_na')}  "
                f"*({tt('price_estimate_label')})*"
            )

        # Per-material indicative ranges
        if tier:
            for m in s.get("materials", []):
                rng = indicative_range(m, tier)
                if rng:
                    low, high = rng
                    mat_label = tt(f"material_{m}") if f"material_{m}" in (
                        "material_silk", "material_cotton", "material_tencel",
                        "material_bamboo", "material_linen", "material_wool",
                    ) else m
                    price_lines.append(
                        f"• **{tt('indicative_price')} {tt('per_material')} {mat_label}:** "
                        f"{format_range(low, high)}"
                    )

        if tier_label:
            price_lines.append(f"*{tier_label}*")

        st.warning("  \n".join(price_lines))

        if s.get("ethical_principles"):
            st.write(f"**{tt('principles')}:** {s['ethical_principles']}")

        if s.get("verify_notes"):
            st.caption(f"ℹ️ {tt('verify_notes')}: {s['verify_notes']}")

        # --- Inquiry section ---
        with st.expander(f"📨 {tt('inquiry')}", expanded=False):
            email = s.get("contact_email")
            contact_page = s.get("contact_page") or s.get("website")

            btn_cols = st.columns(2)
            with btn_cols[0]:
                if email:
                    st.link_button(
                        tt("send_email"),
                        mailto_link(email, inquiry_subject, inquiry_body),
                        type="primary",
                    )
                    st.caption(f"✉️ {email}")
                else:
                    st.caption(f"⚠️ {tt('no_public_email')}")
            with btn_cols[1]:
                if contact_page:
                    st.link_button(tt("open_contact_page"), contact_page)

            st.markdown(f"**{tt('inquiry_template')}**")
            st.caption(tt("copy_hint"))
            st.text_area(
                label=tt("inquiry_template"),
                value=f"Subject: {inquiry_subject}\n\n{inquiry_body}",
                height=320,
                key=f"inquiry_{s['id']}",
                label_visibility="collapsed",
            )


inquiry_subject, inquiry_body = build_inquiry(
    lang=lang,
    materials=materials,
    mommi=mommi_selected,
    only_mulberry=only_mulberry,
    dyeing_required=dyeing_required,
)

with tab_curated:
    st.write(f"**{tt('count_results')}** {len(filtered)}")
    if not filtered:
        st.warning(tt("no_results"))
    else:
        for s in filtered:
            render_supplier_card(s, inquiry_subject, inquiry_body)


with tab_web:
    st.write(tt("web_intro"))
    st.warning(tt("web_disclaimer"))

    default_query = build_query(
        materials=materials,
        mommi=mommi_selected,
        only_mulberry=only_mulberry,
        dyeing_required=dyeing_required,
        regions=regions,
    )
    user_query = st.text_input(tt("web_query_label"), value=default_query)

    if st.button("🔍 " + tt("web_search_button"), type="primary"):
        with st.spinner(tt("web_searching")):
            results = search_web(user_query, max_results=15)
        if not results:
            st.info(tt("web_no_results"))
        else:
            for r in results:
                with st.container(border=True):
                    title = r.get("title") or r.get("href", "")
                    href = r.get("href") or "#"
                    body = r.get("body") or ""
                    st.markdown(f"### [{title}]({href})")
                    st.caption(href)
                    if body:
                        st.write(body)
